import { useState } from "react";
import { apiRequest } from "../../../api";

const mediaOptions = {
  podcast: {
    accept: "audio/mpeg,audio/mp4,audio/wav,audio/aac,audio/ogg,video/mp4,video/webm,video/ogg",
    hint: "MP3, M4A, WAV, AAC, OGG, MP4 or WebM · max 500 MB"
  },
  video: {
    accept: "video/mp4,video/webm,video/ogg",
    hint: "MP4, WebM or OGG video · max 500 MB"
  },
  magazine: {
    accept: "application/pdf",
    hint: "PDF digital edition · max 500 MB"
  }
};

export default function MediaUploadField({ kind, label, value, onChange, required = false }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const options = mediaOptions[kind];

  async function uploadMedia(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("media", file);
    setUploading(true);
    setUploadError("");
    try {
      const result = await apiRequest("/api/admin/uploads/media", {
        method: "POST",
        body: formData
      });
      onChange(result.media.url);
    } catch (requestError) {
      setUploadError(requestError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return <label className="span-two admin-media-field">{label}
    <input
      type="text"
      inputMode="url"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Paste a URL or upload a file"
      required={required}
    />
    <span className="admin-media-upload-row">
      <input
        type="file"
        accept={options.accept}
        onChange={uploadMedia}
        disabled={uploading}
        aria-label={`Upload ${label.toLowerCase()}`}
      />
      <span>{uploading ? "Uploading media…" : options.hint}</span>
    </span>
    {uploadError && <span className="admin-image-upload-error" role="alert">{uploadError}</span>}
  </label>;
}
