"""Prepare a web PDF without changing the source, page order, text or blanks."""
import sys, json, pathlib, io, hashlib, re
import pymupdf as pdf
from PIL import Image, ImageChops, ImageStat

source, output, report_path = map(pathlib.Path, sys.argv[1:4])
original = pdf.open(source)
book = pdf.open()
book.insert_pdf(original, links=False, annots=False)
replaced = set()
trimmed = []
for index, page in enumerate(book):
    # TrimBox is the finished paper edge; only printer marks/bleed are outside it.
    trim = original[index].trimbox
    page.set_cropbox(trim)
    trimmed.append(list(trim))
    for item in page.get_images(full=True):
        xref = item[0]
        if xref in replaced:
            continue
        if item[1]:
            raise ValueError("Masked image requires manual review, page " + str(index + 1))
        pix = pdf.Pixmap(book, xref)
        if pix.colorspace is None:
            raise ValueError("Unsupported image colorspace")
        if pix.colorspace.n != 3:
            pix = pdf.Pixmap(pdf.csRGB, pix)
        image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
        data = io.BytesIO()
        image.save(data, format="JPEG", quality=82, optimize=True)
        page.replace_image(xref, stream=data.getvalue())
        replaced.add(xref)
book.set_metadata({})
book.del_xml_metadata()
output.parent.mkdir(parents=True, exist_ok=True)
temporary = output.with_suffix(".building.pdf")
if temporary.exists(): temporary.unlink()
book.save(temporary, garbage=4, deflate=True, clean=True)
book.close()
check = pdf.open(temporary)
assert len(check) == len(original)
checks = []
for i, (before, after) in enumerate(zip(original, check)):
    before.set_cropbox(before.trimbox)
    assert re.sub(r"\s+", " ", before.get_text()).strip() == re.sub(r"\s+", " ", after.get_text()).strip(), "Text changed at page " + str(i + 1)
    assert abs(before.rect.width-after.rect.width) < .01
    assert abs(before.rect.height-after.rect.height) < .01
    images = after.get_images(full=True)
    for image in images:
        assert max(image[2], image[3]) <= 2000, "Oversized embedded image"
    def render(page):
        pix = page.get_pixmap(matrix=pdf.Matrix(500/page.rect.width,500/page.rect.width), alpha=False)
        return Image.frombytes("RGB", [pix.width,pix.height], pix.samples)
    a,b = render(before),render(after)
    error = sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3
    assert error < 5, "Unexpected visual change at page " + str(i + 1)
    checks.append({"page":i+1,"images":len(images),"blank":not before.get_text().strip() and not before.get_images(),"meanPixelDifference":round(error,4)})
assert not check.get_xml_metadata()
assert not any(check.metadata.get(k) for k in ["author","creator","producer","creationDate","modDate"])
check.close()
temporary.replace(output)
report = {"sourceSha256":hashlib.sha256(source.read_bytes()).hexdigest(),"outputSha256":hashlib.sha256(output.read_bytes()).hexdigest(),"sourceBytes":source.stat().st_size,"webBytes":output.stat().st_size,"pages":len(original),"imageLimit":2000,"printerMarginsRemoved":True,"pagesVerified":checks}
report_path.parent.mkdir(parents=True,exist_ok=True)
report_path.write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({"pages":report["pages"],"webBytes":report["webBytes"],"maxPixelDifference":max(c["meanPixelDifference"] for c in checks)}))
