import Image  from "next/image";
import googleIconSrc from "@/public/icons/google.svg";     
import { cn } from "@/lib/utils";

export const GoogleIcon = ({ className }: { className?: string }) => {
  return (
    <svg className={`w-5 h-5 mr-2` + className} viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 4.75C14.1 4.75 15.9 5.55 17.25 6.8L21.1 2.95C18.85 1.1 15.65 0 12 0C7.3 0 3.25 2.65 1.3 6.5L5.7 9.95C6.7 6.9 9.15 4.75 12 4.75Z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.25C23.5 11.35 23.4 10.5 23.25 9.7H12V14.25H18.6C18.3 15.75 17.45 17 16.15 17.8L20.35 21.1C22.65 19 24 15.9 24 12.25H23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.5C4.95 13.75 4.8 12.95 4.8 12.15C4.8 11.35 4.95 10.55 5.2 9.8L0.8 6.35C0.3 8.15 0 10.05 0 12.05C0 14.05 0.3 15.95 0.8 17.75L5.2 14.5Z"
      />
      <path
        fill="#34A853"
        d="M12 24C15.25 24 17.95 22.95 20 21.1L15.8 17.8C14.75 18.55 13.45 19 12 19C9.15 19 6.7 16.85 5.7 13.8L1.3 17.25C3.25 21.1 7.3 24 12 24Z"
      />
    </svg>
  );
};