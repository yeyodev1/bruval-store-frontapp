/**
 * Landings de los tres productos de la campaña (estrategia acordada el 27 oct 2026):
 * ramo de rosas preservadas, rosa en llavero y la rosa de La Bella y la Bestia.
 *
 * Se sirven en /producto/:slug con el mismo checkout de siempre. `productSlug` es el
 * producto real en la API (precio, stock y pedido salen de ahí); el resto es el
 * contenido de la landing y las fotos de la sesión de Bakano en /public/landings.
 */
export interface LandingReason {
  title: string;
  text: string;
}

export interface LandingFaq {
  question: string;
  answer: string;
}

export interface Landing {
  slug: string;
  productSlug: string;
  name: string;
  eyebrow: string;
  lead: string;
  seoDescription: string;
  images: { src: string; alt: string }[];
  highlights: string[];
  reasonsTitle: string;
  reasons: LandingReason[];
  includes: string[];
  faqs: LandingFaq[];
}

const gallery = (slug: string, alts: string[]) =>
  alts.map((alt, index) => ({ src: `/landings/${slug}/${String(index + 1).padStart(2, "0")}.webp`, alt }));

const deliveryFaq: LandingFaq = {
  question: "¿Cuándo llega?",
  answer: "Puedes pedirlo hoy mismo. Lo entregamos desde 2 horas después de confirmar tu pago, con envío gratis en Guayaquil, Samborondón y Durán. Eliges el día y la hora en el checkout.",
};
const cardFaq: LandingFaq = {
  question: "¿Puedo enviarlo con un mensaje?",
  answer: "Sí. En el checkout escribes el texto de la tarjeta y la incluimos en el regalo. Si quieres que sea sorpresa, pon sus datos como destinatario.",
};
const paymentFaq: LandingFaq = {
  question: "¿Cómo pago?",
  answer: "Con tarjeta de crédito o débito por PayPhone, directo en la página. Si prefieres transferencia, toca el botón de WhatsApp y te ayudamos a cerrar el pedido.",
};

export const landings: Landing[] = [
  {
    slug: "rosa-bella-y-bestia",
    productSlug: "rp40",
    name: "La rosa de La Bella y la Bestia",
    eyebrow: "Rosa preservada en cúpula de cristal",
    lead: "La rosa roja bajo cristal que ella reconoce de la película. No se marchita, no necesita agua y se queda en su mesa por años. Si no sabes qué regalarle, empieza por aquí.",
    seoDescription: "La rosa de La Bella y la Bestia: rosa roja preservada en cúpula de cristal. Dura años sin agua. Envío gratis en Guayaquil y entrega desde 2 horas.",
    images: gallery("rosa-bella-y-bestia", [
      "Cúpula de cristal con la rosa de La Bella y la Bestia",
      "Rosa roja preservada dentro de una cúpula de cristal con lazo Bruval",
      "Rosa roja preservada sin la cúpula, con tallo y hojas",
      "Detalle de la rosa preservada y su base con musgo",
      "Cúpula alta de cristal con rosa roja preservada",
    ]),
    highlights: ["Dura años", "Sin agua ni cuidados", "Entrega desde 2 horas", "Envío gratis"],
    reasonsTitle: "No tienes que explicar nada.",
    reasons: [
      { title: "Ella ya sabe lo que significa", text: "Es la rosa de La Bella y la Bestia. La ve y entiende el mensaje, sin que tengas que decir una palabra." },
      { title: "No se muere en una semana", text: "Es una rosa natural preservada: mantiene su color y su forma por años, sin agua ni cuidados." },
      { title: "Llega lista para entregar", text: "Cúpula de cristal, base negra y lazo Bruval. Tú solo la entregas, o la llevamos nosotros." },
    ],
    includes: [
      "Rosa roja preservada talla Extra Large, con tallo y hojas",
      "Cúpula de cristal con base negra",
      "Musgo y detalles decorativos preservados",
      "Lazo Bruval y tarjeta con tu mensaje",
    ],
    faqs: [
      { question: "¿Cuánto dura la rosa?", answer: "Años, si la mantienes dentro de la cúpula, lejos del sol directo y de la humedad. No necesita agua ni ningún cuidado." },
      deliveryFaq,
      cardFaq,
      paymentFaq,
    ],
  },
  {
    slug: "ramo-rosas-preservadas",
    productSlug: "ramo-rosas-preservadas",
    name: "Ramo de rosas preservadas",
    eyebrow: "Rosas rojas en florero de cerámica",
    lead: "Haz la cuenta: un ramo normal se bota a la semana. Este son rosas rojas preservadas que duran años, ya armadas en un florero de cerámica blanca con lazo rojo. Sin agua, sin buscar dónde ponerlo.",
    seoDescription: "Ramo de rosas rojas preservadas en florero de cerámica con lazo. Dura años sin agua. Envío gratis en Guayaquil y entrega desde 2 horas.",
    images: gallery("ramo-rosas-preservadas", [
      "Ramo de rosas rojas preservadas en florero de cerámica blanca con lazo rojo",
      "Ramo de rosas preservadas visto de frente",
      "Ramo de rosas preservadas con detalles florales rojos",
      "Ramo de rosas preservadas visto de lado",
      "Florero de cerámica blanca con forma de ramo y lazo rojo",
    ]),
    highlights: ["Dura años", "Florero incluido", "Entrega desde 2 horas", "Envío gratis"],
    reasonsTitle: "Un ramo que no termina en la basura.",
    reasons: [
      { title: "Haz la cuenta", text: "Un ramo natural dura 7 días. Este se queda en su escritorio o en su cuarto por años, recordándole quién se lo dio." },
      { title: "Llega armado", text: "Las rosas vienen fijas en el florero de cerámica. No hay que cortarlas, ponerlas en agua ni buscar jarrón." },
      { title: "Rosas de verdad", text: "Son rosas naturales preservadas: se sienten y se ven reales, pero no se marchitan." },
    ],
    includes: [
      "Rosas rojas preservadas con follaje",
      "Detalles florales rojos preservados",
      "Florero de cerámica blanca con lazo rojo",
      "Tarjeta con tu mensaje",
    ],
    faqs: [
      { question: "¿Cuánto duran las rosas?", answer: "Años, si las mantienes lejos del sol directo y de la humedad. No necesitan agua; solo quítales el polvo con suavidad de vez en cuando." },
      deliveryFaq,
      cardFaq,
      paymentFaq,
    ],
  },
  {
    slug: "llavero-rosa-preservada",
    productSlug: "bv0500",
    name: "Llavero con rosa preservada",
    eyebrow: "Un Bruval para llevar en el bolsillo",
    lead: "Una rosa roja de verdad, preservada dentro de una esfera transparente, para sus llaves, su mochila o su cartera. Llega en caja Bruval. El detalle perfecto para cuando todavía no es el momento del ramo grande.",
    seoDescription: "Llavero con rosa roja preservada en esfera transparente, en caja de regalo Bruval. Envío gratis en Guayaquil y entrega desde 2 horas.",
    images: gallery("llavero-rosa-preservada", [
      "Llavero con rosa roja preservada en esfera transparente y pompones rosados",
      "Llavero con rosa preservada dentro de su caja azul Bruval",
      "Llavero con rosa preservada en la caja abierta, vista desde arriba",
      "Caja de regalo Bruval abierta con el llavero de rosa",
      "Caja de regalo azul Bruval cerrada",
    ]),
    highlights: ["Rosa natural", "Caja de regalo", "Entrega desde 2 horas", "Envío gratis"],
    reasonsTitle: "Va con ella a todas partes.",
    reasons: [
      { title: "Lo ve todos los días", text: "Cada vez que saca las llaves o abre la cartera, se acuerda de ti." },
      { title: "Rosa real, no de plástico", text: "Es una rosa natural preservada dentro de una esfera transparente. Mantiene su color por años." },
      { title: "Precio de detalle, cara de regalo", text: "Llega en la caja azul de Bruval, lista para entregar. Ideal para un aniversario de meses o un \"porque sí\"." },
    ],
    includes: [
      "Rosa roja preservada en esfera transparente",
      "Hoja decorativa y pompones rosados",
      "Argolla y mosquetón dorados",
      "Caja de regalo Bruval y tarjeta con tu mensaje",
    ],
    faqs: [
      { question: "¿La rosa es natural?", answer: "Sí. Es una rosa natural preservada, sellada dentro de la esfera para que no se dañe con el uso diario." },
      deliveryFaq,
      cardFaq,
      paymentFaq,
    ],
  },
];

export function landingBySlug(slug?: string) {
  return slug ? landings.find((landing) => landing.slug === slug) : undefined;
}
