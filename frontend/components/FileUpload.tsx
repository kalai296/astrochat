'use client';
import { useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Paperclip } from 'lucide-react';

export default function FileUpload({
  token,
  onUploaded,
}: {
  token: string;
  onUploaded: (result: { url: string; originalName: string }) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Uploading file...');
    const fd = new FormData();
    fd.append('file', file);

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      toast.success('File uploaded!', { id: toastId });
      onUploaded({ url: data.url, originalName: file.name });
    } catch {
      toast.error('Upload failed', { id: toastId });
    }

    // reset input so same file can be re-uploaded
    if (ref.current) ref.current.value = '';
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.jpg,.png,.jpeg,.gif"
        onChange={handleFile}
      />
      <button
        type="button"
        title="Attach file"
        onClick={() => ref.current?.click()}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
      >
        <Paperclip size={18} />
      </button>
    </>
  );
}
