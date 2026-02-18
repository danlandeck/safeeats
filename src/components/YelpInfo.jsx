import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, DollarSign, Phone, ExternalLink, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function YelpInfo({ yelpData, restaurantName }) {
  if (!yelpData) {
    return (
      <Card className="p-6 border-slate-200 bg-slate-50">
        <div className="text-center text-slate-500">
          <p className="text-sm">Yelp integration requires backend functions.</p>
          <p className="text-xs mt-2">Enable backend functions in settings to see reviews, photos, and more.</p>
        </div>
      </Card>
    );
  }

  const { rating, review_count, price, photos, reviews, categories, phone, hours, url } = yelpData;

  return (
    <div className="space-y-6">
      {/* Yelp Header */}
      <Card className="p-6 border-slate-200 bg-gradient-to-br from-white to-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <img src="https://s3-media0.fl.yelpcdn.com/assets/srv0/styleguide/1ea0e5938cb6/assets/img/brand_guidelines/yelp_fullcolor.png" alt="Yelp" className="h-6" />
            Customer Experience
          </h3>
          {url && (
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                View on Yelp
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </a>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {rating && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : i < rating
                        ? "fill-yellow-200 text-yellow-400"
                        : "fill-slate-200 text-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-slate-700">{rating}</span>
              {review_count && (
                <span className="text-xs text-slate-500">({review_count} reviews)</span>
              )}
            </div>
          )}

          {price && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <DollarSign className="w-3 h-3 mr-1" />
              {price}
            </Badge>
          )}

          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 3).map((cat, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {cat.title}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {phone && (
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            {phone}
          </div>
        )}

        {hours && hours[0]?.is_open_now !== undefined && (
          <div className="flex items-center gap-2 mt-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className={hours[0].is_open_now ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
              {hours[0].is_open_now ? "Open Now" : "Closed"}
            </span>
          </div>
        )}
      </Card>

      {/* Photos */}
      {photos && photos.length > 0 && (
        <Card className="p-6 border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.slice(0, 6).map((photo, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                <img
                  src={photo}
                  alt={`${restaurantName} photo ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <Card className="p-6 border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Recent Reviews</h4>
          <div className="space-y-4">
            {reviews.map((review, i) => (
              <div key={i} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-start gap-3">
                  {review.user?.image_url && (
                    <img
                      src={review.user.image_url}
                      alt={review.user.name}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-slate-900">
                        {review.user?.name || "Anonymous"}
                      </span>
                      <div className="flex">
                        {[...Array(5)].map((_, j) => (
                          <Star
                            key={j}
                            className={`w-3 h-3 ${
                              j < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-slate-200 text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">
                        {review.time_created && new Date(review.time_created).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{review.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}