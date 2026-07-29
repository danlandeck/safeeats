import React from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsOfUse() {
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
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Terms of Use</h1>
          </div>
          <p className="text-slate-400 text-sm mt-2">Last updated: July 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 text-slate-700">
        <section>
          <p className="text-sm text-slate-500">
            These Terms of Use ("Terms") govern your use of the SafeEats™ platform ("the Service").
            By accessing or using the Service, you agree to be bound by these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">1. Service Description</h2>
          <p className="text-sm">
            SafeEats™ aggregates publicly available restaurant health inspection data from government
            sources and presents it in a normalized format with safety grades. The Service is provided
            for informational purposes to help users make informed dining decisions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">2. Non-Authoritative Data</h2>
          <p className="text-sm">
            All inspection data displayed originates from third-party government agencies. SafeEats™
            does not conduct inspections and is not the source of truth for any inspection result.
            Data may be delayed, incomplete, or outdated due to caching and source API availability.
            Always verify critical information directly with the relevant health department. SafeEats™
            shall not be held liable for decisions made based on data displayed on the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">3. Intellectual Property</h2>
          <p className="text-sm">
            The SafeEats™ name, logo, and original software are protected by common-law trademark and
            copyright. The "™" symbol indicates a common-law trademark claim — no federal registration
            is required to assert brand rights. Government data displayed on the Service remains the
            property of the respective issuing agencies. You may not copy, redistribute, or scrape the
            Service's compiled data for commercial purposes without written permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">4. Acceptable Use</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Do not attempt to access backend APIs without authentication or bypass security controls.</li>
            <li>Do not scrape, bulk-download, or republish inspection data from the Service.</li>
            <li>Do not use the Service for any unlawful purpose or in violation of applicable laws.</li>
            <li>Do not interfere with the proper functioning of the Service or its servers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">5. No Warranty</h2>
          <p className="text-sm">
            The Service is provided "as is" and "as available" without warranties of any kind, express
            or implied. We do not guarantee that the data is accurate, complete, or current. We do not
            warrant that the Service will be uninterrupted or error-free.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">6. Limitation of Liability</h2>
          <p className="text-sm">
            To the maximum extent permitted by law, SafeEats™ shall not be liable for any indirect,
            incidental, consequential, or punitive damages arising from your use of the Service or
            reliance on any data displayed therein.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">7. Third-Party Links</h2>
          <p className="text-sm">
            The Service provides links to official government health department portals and other
            third-party websites. We are not responsible for the content, accuracy, or practices of
            these external sites.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">8. Changes to These Terms</h2>
          <p className="text-sm">
            We may revise these Terms at any time. Continued use of the Service after changes are
            posted constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">9. Contact</h2>
          <p className="text-sm">
            Questions about these Terms? Visit our <Link to="/contact" className="text-[#4CAF50] font-bold hover:underline">Contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}