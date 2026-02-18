import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { ShieldCheck, Database, TrendingUp, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Home")}>
          <Button variant="ghost" className="mb-6 text-slate-500 hover:text-slate-800 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full text-emerald-700 font-semibold mb-4">
              <ShieldCheck className="w-5 h-5" />
              About SafeEats
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              Your Food Safety Companion
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Making public health inspection data accessible and understandable for everyone.
            </p>
          </div>

          {/* Mission */}
          <Card className="p-8 border-slate-200 bg-white">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              SafeEats was created to empower consumers with transparent, easy-to-understand information about restaurant food safety. We believe everyone deserves to know the health inspection history of the establishments where they eat.
            </p>
            <p className="text-slate-600 leading-relaxed">
              By transforming complex inspection data into visual safety scores and clear violation reports, we help you make informed dining decisions that prioritize your health and safety.
            </p>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 border-slate-200">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Real-Time Data</h3>
              <p className="text-sm text-slate-600">
                Direct integration with King County Public Health inspection records, updated regularly.
              </p>
            </Card>

            <Card className="p-6 border-slate-200">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Clear Scoring</h3>
              <p className="text-sm text-slate-600">
                Color-coded 0-100 safety scores make it easy to compare establishments at a glance.
              </p>
            </Card>

            <Card className="p-6 border-slate-200">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Full Transparency</h3>
              <p className="text-sm text-slate-600">
                Complete inspection history with detailed violation descriptions and severity levels.
              </p>
            </Card>
          </div>

          {/* How It Works */}
          <Card className="p-8 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Calculate Safety Scores</h2>
            <div className="space-y-3 text-slate-600">
              <p className="leading-relaxed">
                <strong className="text-slate-900">1. Data Source:</strong> We pull official inspection records from King County Public Health's open data portal.
              </p>
              <p className="leading-relaxed">
                <strong className="text-slate-900">2. Penalty Points:</strong> Inspectors assign penalty points for violations. Critical violations (RED) receive more points than non-critical (BLUE) issues.
              </p>
              <p className="leading-relaxed">
                <strong className="text-slate-900">3. Safety Score:</strong> We convert penalty points to a 0-100 safety score. Lower penalties = higher safety score. A perfect score of 100 means zero violations.
              </p>
              <p className="leading-relaxed">
                <strong className="text-slate-900">4. Color Coding:</strong> Scores are color-coded from red (0-29, critical concerns) through yellow/orange to green (90-100, excellent safety).
              </p>
            </div>
          </Card>

          {/* Data Disclaimer */}
          <Card className="p-6 border-amber-200 bg-amber-50">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Data Disclaimer</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              All inspection data is sourced from official King County Public Health records. While we strive for accuracy, inspection results can change over time. Always verify current health ratings and use this tool as one of many factors in your dining decisions.
            </p>
          </Card>

          {/* Footer */}
          <div className="text-center pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Built with <Heart className="w-4 h-4 inline text-red-500 fill-red-500" /> for food safety transparency
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}