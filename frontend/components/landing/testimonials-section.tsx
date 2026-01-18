// frontend/src/components/landing/testimonials-section.tsx
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Adeleke Adeyemi",
    role: "Product Designer",
    company: "TechFlow Africa",
    content:
      "ManageHub has transformed how we manage our workspace. The biometric check-in is seamless, and the analytics help us optimize our space usage. Highly recommend!",
    rating: 5,
    image: null,
  },
  {
    name: "Oluwaseun Balogun",
    role: "CEO",
    company: "StartupHub Lagos",
    content:
      "The Stellar wallet integration is a game-changer. We can now handle international payments instantly with minimal fees. The admin dashboard is incredibly intuitive.",
    rating: 5,
    image: null,
  },
  {
    name: "Amina Mohammed",
    role: "Freelance Developer",
    company: "Independent",
    content:
      "As a freelancer, the hot desk option is perfect for me. I love the flexibility and the community. The app makes everything so easy - from booking to payment.",
    rating: 5,
    image: null,
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-base font-semibold text-blue-600">
            Testimonials
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Loved by workspace professionals
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Don't just take our word for it - hear from our community.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg"
            >
              {/* Rating */}
              <div className="flex gap-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="mt-4 text-gray-700">"{testimonial.content}"</p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
