import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input"; // Import Input
import { Button } from "@/components/ui/button"; // Import Button
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"; // Import professional icons

const Footer = () => {
  const footerSections = [
    {
      title: "Platform",
      links: [
        { label: "Destinations", path: "/destinations" },
        { label: "Calculator", path: "/calculator" },
        { label: "Community", path: "/community" },
        { label: "Dashboard", path: "/dashboard" }
      ]
    },
    {
      title: "For Businesses",
      links: [
        { label: "Register Business", path: "/register-destination" },
        
      ]
    },
    {
      title: "Support",
      links: [
        { label: "Help Center", path: "/help" },
        { label: "Contact Us", path: "/contact" },
        { label: "Privacy Policy", path: "/privacy" },
        { label: "Terms of Service", path: "/terms" }
      ]
    }
  ];

  const socialLinks = [
    { icon: <Facebook className="w-5 h-5" />, href: "#", label: "Facebook" },
    { icon: <Twitter className="w-5 h-5" />, href: "#", label: "Twitter" },
    { icon: <Instagram className="w-5 h-5" />, href: "#", label: "Instagram" },
    { icon: <Linkedin className="w-5 h-5" />, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="bg-forest text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* --- 2. Modernized Main Footer Layout --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 py-16">
          {/* Brand Section */}
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-4">
              <img 
                src="/lovable-uploads/f91ba406-163e-4e12-ab08-1481effe6d76.png" 
                alt="EcoLakbay Logo" 
                className="h-8 w-auto"
              />
            </div>
            <p className="text-white/80 leading-relaxed max-w-xs">
              Transforming tourism in the Philippines through sustainable practices, community engagement, and environmental responsibility.
            </p>
          </div>

          {/* Navigation Sections */}
          {footerSections.map((section, index) => (
            <div key={index} className="col-span-1">
              <h3 className="font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link 
                      to={link.path} 
                      className="text-white/80 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* --- 3. Refined Bottom Bar --- */}
        <div className="py-8 border-t border-white/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/60 text-sm text-center sm:text-left">
            © {new Date().getFullYear()} EcoLakbay. All rights reserved.
          </p>
          <div className="flex space-x-4">
            {socialLinks.map((link, index) => (
              <a 
                key={index} 
                href={link.href}
                aria-label={link.label}
                className="text-white/80 hover:text-white transition-colors"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
