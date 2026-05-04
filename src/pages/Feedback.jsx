import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";

export default function Feedback() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await base44.integrations.Core.SendEmail({
        to: "dan.landeck@gmail.com",
        subject: "SafeEats FEEDBACK",
        body: `
New SafeEats Feedback Received:

Name: ${formData.name}
Email: ${formData.email}

Message:
${formData.message}

---
Submitted from SafeEats App
        `.trim(),
      });

      setIsSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("Failed to send feedback:", error);
      alert("Sorry, there was an error sending your feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-6 text-slate-500 hover:text-slate-800 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full text-white font-semibold mb-4">
              <MessageSquare className="w-5 h-5" />
              User Feedback
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              We'd Love to Hear From You
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-xl mx-auto">
              Your feedback helps us improve SafeEats for food safety seekers everywhere in the world.
            </p>
          </div>

          {/* Success Message */}
          {isSubmitted && (
            <Card className="p-6 border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-slate-700 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900">Thank you for your feedback!</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    We've received your message and will review it carefully.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Feedback Form */}
          <Card className="p-8 border-slate-200 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Your Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Your Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                  Your Feedback
                </label>
                <Textarea
                  id="message"
                  placeholder="Tell us what you think about SafeEats, report issues, suggest features, or share your experience..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* ADA Complaints */}
          <Card className="p-6 border-2 border-emerald-300 bg-emerald-50">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">♿</span>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-900 mb-1">Report Incorrect ADA / Accessibility Info</h3>
                <p className="text-sm text-emerald-800 leading-relaxed mb-2">
                  Accessibility matters deeply to us. If SafeEats shows incorrect ADA or wheelchair accessibility information for any restaurant, <strong>please report it here</strong>. Daniel personally follows up with businesses where accessibility data is wrong — because every guest deserves accurate info before they arrive.
                </p>
                <p className="text-xs text-emerald-700 font-semibold">
                  📧 Start your message with <span className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono">ADA COMPLAINT:</span> so it gets prioritized.
                </p>
              </div>
            </div>
          </Card>

          {/* Additional Info */}
          <Card className="p-6 border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">What kind of feedback can I share?</h3>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>• Report bugs or technical issues</li>
              <li>• Suggest new features or improvements</li>
              <li>• Share your experience using SafeEats</li>
              <li>• Report incorrect or outdated information</li>
              <li>♿ Report wrong ADA / accessibility info (we follow up with businesses!)</li>
              <li>• General questions or comments</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}