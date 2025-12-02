import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle, Mail, Phone, HelpCircle } from "lucide-react";

const Help = () => {
  const faqItems = [
    {
      question: "How do I calculate my carbon footprint?",
      answer: "Use our Carbon Calculator tool to input your travel details including transportation method, and distance. The calculator will provide an estimate of your carbon emissions and suggest ways to reduce them."
    },
    {
      question: "How can I register my business as an eco-destination?",
      answer: "Navigate to the 'Register Destination' page and fill out the comprehensive form with your business details, location, sustainability practices, and contact information. Our team will review your application within 5-7 business days."
    },
    {
      question: "What are Green Points and how do I earn them?",
      answer: "Green Points are rewards for eco-friendly actions on our platform. You can earn points by creating community posts, sharing sustainable travel tips, completing carbon calculations, and visiting approved eco-destinations."
    },
    {
      question: "How do I reset my password?",
      answer: "Click on 'Sign In' and then select 'Forgot Password' on the login form. Enter your email address and we'll send you instructions to reset your password."
    },
    {
      question: "Can I delete my account?",
      answer: "Yes, you can delete your account by contacting our support team. Please note that this action is irreversible and will remove all your data including Green Points and community posts."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-forest mb-4">Help Center</h1>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions and get support for using EcoLakbay
            </p>
          </div>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-forest flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Help;
