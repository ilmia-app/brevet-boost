import { Mail } from "lucide-react";
import { useLocation } from "react-router-dom";

const ContactButton = () => {
  const location = useLocation();
  if (location.pathname.startsWith("/landing")) return null;

  const href = "mailto:sprintdnb@gmail.com?subject=" + encodeURIComponent("Question Sprint DNB");

  return (
    <a
      href={href}
      aria-label="Nous contacter par email"
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-emerald-500 hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
    >
      <Mail className="h-5 w-5 md:h-6 md:w-6" />
    </a>
  );
};

export default ContactButton;