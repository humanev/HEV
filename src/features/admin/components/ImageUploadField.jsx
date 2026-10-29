import {useState} from "react";
import {CstButton} from "../../../components/common/ui-components";


import {apiRequest} from "../../../api";



export default function ImageUploadField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState("");

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);
    setSelectedFile(file.name);
    setUploadError("");
    try {
      const result = await apiRequest("/api/admin/uploads/images", {
        method: "POST",
        body: formData
      });
      onChange(result.image.url);
    } catch (requestError) {
      setUploadError(requestError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function clearImage() {
    setSelectedFile("");
    onChange("");
    setUploadError("");
  }
  return <label className="span-two admin-image-field">{label}
    <input type="text" inputMode="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste an image URL or upload a file" required/>
    <span className="admin-image-upload-row">
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadImage} disabled={uploading} aria-label={`Upload ${label.toLowerCase()}`}/>
      <span>{uploading ? "Uploading image…" : selectedFile || "JPEG, PNG, WebP or GIF · max 5 MB"}</span>
      {value && <CstButton type="button" className="admin-delete-link" onClick={clearImage}>Remove image</CstButton>}
    </span>
    {uploadError && <span className="admin-image-upload-error" role="alert">{uploadError}</span>}
    {value && <img className="admin-image-preview" src={value} alt="Selected image preview"/>}
  </label>;
}
