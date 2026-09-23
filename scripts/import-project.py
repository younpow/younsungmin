"""Extract only the approved numbered images from a ZIP into ignored originals."""
import sys,json,pathlib,zipfile,shutil
config=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
root=pathlib.Path.cwd().resolve()
slug=config["project"]
if any(p in ("",".","..") for p in slug.split("/")):raise ValueError("Invalid project")
target=(root/"local-originals"/slug).resolve()
if not target.is_relative_to(root/"local-originals"):raise ValueError("Invalid destination")
target.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(config["zip"]) as archive:
    entries=[i for i in archive.infolist() if not i.is_dir()]
    expected=[f"{n:02}.jpg" for n in range(1,config["expectedImages"]+1)]
    if sorted(i.filename for i in entries)!=expected:raise ValueError("ZIP must contain exactly the numbered JPG sequence: "+str(expected))
    for item in entries:
        if item.file_size>100_000_000:raise ValueError("Unexpected image size")
        destination=target/item.filename
        data=archive.read(item)
        if destination.exists() and destination.read_bytes()!=data:raise ValueError("Different existing original: "+str(destination))
        if not destination.exists():destination.write_bytes(data)
hero_target=root/"local-originals/home"/pathlib.Path(config["hero"]).name
hero_target.parent.mkdir(parents=True,exist_ok=True)
if hero_target.resolve()!=pathlib.Path(config["hero"]).resolve():shutil.copy2(config["hero"],hero_target)
print("Imported numbered originals; source files preserved.")
