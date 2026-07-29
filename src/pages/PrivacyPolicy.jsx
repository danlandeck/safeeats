import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Nunito, sans-serif" }}>
      {/* Header */}
      <div className="bg-slate-900 border-b-4 border-[#4CAF50] py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-[#81c784] hover:text-white transition-colors text-sm font-bold mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to SafeEats™
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4CAF50] flex items-center justify-center border-2 border-white/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-slate-400 text-sm mt-2">Last updated: July 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 text-slate-700">
        <section>
          <p className="text-sm text-slate-500 mb-4">
            SafeEats™ ("we", "us", or "our") operates a platform that aggregates publicly available
            restaurant health inspection data from government sources. This Privacy Policy explains
            what information we collect and how we use it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">1. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Search queries:</strong> Restaurant names and locations you search for are sent to our backend to retrieve inspection data. These are processed in real time and not permanently stored unless cached for performance.</li>
            <li><strong>Account data:</strong> If you create an account, we store your name and email address for authentication purposes.</li>
            <li><strong>Usage data:</strong> We may collect anonymous analytics such as page views and feature usage to improve the platform.</li>
            <li><strong>Cached restaurant data:</strong> Inspection results from government APIs may be cached in our database to improve performance. This data originates from public government sources.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>To display restaurant inspection data and safety grades</li>
            <li>To authenticate your account and secure backend API access</li>
            <li>To improve search results and platform performance</li>
            <li>To send responses to feedback or support requests you submit</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">3. Third-Party Services</h2>
          <p className="text-sm">
            We use Google Places API to enrich restaurant listings with addresses, phone numbers, and
            geographic coordinates. Google's privacy policy applies to data processed by that service.
            We also access public government APIs (e.g., health department portals) to retrieve
            inspection records. These services may log requests independently.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">4. Data We Do Not Collect</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>We do not collect precise device GPS location unless you explicitly grant permission.</li>
            <li>We do not sell or rent your personal information to third parties.</li>
            <li>We do not use third-party advertising or ad-tracking SDKs.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">5. Data Retention</h2>
          <p className="text-sm">
            Cached restaurant inspection data is retained until superseded by newer data from the
            source government API. User account data is retained for the lifetime of your account
            and can be deleted upon request.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">6. Your Rights</h2>
          <p className="text-sm">
            You may request access to, correction of, or deletion of your personal data by contacting
            us through the Contact page. If you are in the EU, UK, or California, you have additional
            rights under GDPR or CCPA respectively.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">7. Children's Privacy</h2>
          <p className="text-sm">
            SafeEats™ is not directed at children under 13. We do not knowingly collect personal
            information from children.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">8. Changes to This Policy</h2>
          <p className="text-sm">
            We may update this Privacy Policy from time to time. Material changes will be reflected
            by updating the "Last updated" date above.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">9. Contact</h2>
          <p className="text-sm">
            Questions about this policy? Visit our <Link to="/contact" className="text-[#4CAF50] font-bold hover:underline">Contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}