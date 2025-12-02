// src/pages/Contact.tsx

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

// This is now a much simpler component with no state or form logic.
const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-forest mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get in touch with our team. We're here to help you with any questions about sustainable tourism in Pampanga.
            </p>
          </div>

          {/* Contact Information (Now centered) */}
          {/* The grid has been removed and replaced with a simpler layout */}
          <div className="space-y-8 max-w-2xl mx-auto">
            
            {/* Office Information */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-forest">Our Office</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-base">
                <div className="flex items-start space-x-4">
                  <MapPin className="w-6 h-6 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">EcoLakbay Headquarters</h3>
                    <p className="text-muted-foreground">San Fernando, Pampanga, Philippines</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Phone className="w-6 h-6 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">+63 (045) 123-4567</h3>
                    <p className="text-sm text-muted-foreground">Available Mon - Fri, 8:00 AM - 6:00 PM</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Mail className="w-6 h-6 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">hello@ecolakbay.com</h3>
                    <p className="text-sm text-muted-foreground">We typically respond within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Clock className="w-6 h-6 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Business Hours</h3>
                    <p className="text-muted-foreground">Monday - Friday: 8:00 AM - 6:00 PM</p>
                    <p className="text-muted-foreground">Saturday: 9:00 AM - 4:00 PM</p>
                    <p className="text-muted-foreground text-sm">Sunday: Closed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

           

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
