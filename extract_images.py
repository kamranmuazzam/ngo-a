import fitz
import os

pdf_path = "sample data/CLEC Impact Assessment Report_Gorkha_2025 Dec.docx (1).pdf"
out_dir = "scratch/extracted_images"
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)
for i in range(len(doc)):
    page = doc[i]
    images = page.get_images(full=True)
    for j, img in enumerate(images):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        ext = base_image["ext"]
        with open(os.path.join(out_dir, f"page{i}_img{j}.{ext}"), "wb") as f:
            f.write(image_bytes)
print("Images extracted.")
