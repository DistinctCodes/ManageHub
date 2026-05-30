'use client';

import { CheckCircle } from 'lucide-react';

const features = [
  {
    title: 'AI-Powered Intelligence',
    description: 'Advanced machine learning models that detect, classify, and respond to incidents with precision.',
  },
  {
    title: 'Real-Time Monitoring',
    description: 'Stay informed 24/7 with instant alerts and live updates on your operations and security.',
  },
  {
    title: 'Seamless Integration',
    description: 'Works perfectly with your existing systems and workflows without disruption.',
  },
  {
    title: 'Global Expertise',
    description: 'Access professional monitoring and insights from our team of experts worldwide.',
  },
  {
    title: 'Scalable Solutions',
    description: 'From small operations to large enterprises, we scale with your needs.',
  },
  {
    title: 'Verified Results',
    description: 'Transparent reporting and clear audit trails for every action and incident.',
  },
];

export function Features() {
  return (
    <section id="why-lisatech" className="py-20 sm:py-28 lg:py-32 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Why Choose Lisatech?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Trusted by leading organizations for intelligent operations and security
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 shrink-0 text-accent mt-0.5" />
                <h3 className="text-lg font-semibold leading-tight">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
