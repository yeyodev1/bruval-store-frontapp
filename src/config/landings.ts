/**
 * Landings de los tres productos de la campaña (estrategia acordada el 27 oct 2026):
 * jarrón de rosas preservadas, rosa en llavero y la rosa de La Bella y la Bestia.
 *
 * Se sirven en /producto/:slug con el mismo checkout de siempre. `productSlug` es el
 * producto real en la API (precio, stock y pedido salen de ahí); el resto es el
 * contenido de la landing y las fotos de la sesión de Bakano en /public/landings.
 */
export interface LandingReason {
  title: string;
  text: string;
}

/** Color que el cliente elige antes de comprar; viaja en el pedido junto al producto. */
export interface LandingColor {
  name: string;
  swatch: string;
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
  colors?: LandingColor[];
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
const warrantyFaq: LandingFaq = {
  question: "¿Tiene garantía?",
  answer: "Sí, Bruval te da 6 meses de garantía. La flor dura de 3 a 5 años; si en los primeros 6 meses notas algún problema, escríbenos por WhatsApp.",
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
    lead: "La rosa bajo cristal que ella reconoce de la película, roja como en el cuento o en su color favorito. No se marchita, no necesita agua y se queda en su mesa de 3 a 5 años. Si no sabes qué regalarle, empieza por aquí.",
    seoDescription: "La rosa de La Bella y la Bestia: rosa preservada en cúpula de cristal, en 7 colores. Dura de 3 a 5 años sin agua y tiene 6 meses de garantía. Envío gratis en Guayaquil.",
    images: gallery("rosa-bella-y-bestia", [
      "Cúpula de cristal con la rosa de La Bella y la Bestia",
      "Rosa roja preservada dentro de una cúpula de cristal con lazo Bruval",
      "Rosa roja preservada sin la cúpula, con tallo y hojas",
      "Detalle de la rosa preservada y su base con musgo",
      "Cúpula alta de cristal con rosa roja preservada",
    ]),
    colors: [
      { name: "Rojo", swatch: "#b3122e" },
      { name: "Blanco", swatch: "#f6f1ea" },
      { name: "Rosado", swatch: "#f2a7bb" },
      { name: "Lila", swatch: "#c8a2d6" },
      { name: "Morado", swatch: "#6b2d84" },
      { name: "Fucsia", swatch: "#d6246e" },
      { name: "Azul", swatch: "#2f4fa2" },
    ],
    highlights: ["Dura de 3 a 5 años", "Garantía de 6 meses", "Sin agua ni cuidados", "Envío gratis"],
    reasonsTitle: "No tienes que explicar nada.",
    reasons: [
      { title: "Ella ya sabe lo que significa", text: "Es la rosa de La Bella y la Bestia. La ve y entiende el mensaje, sin que tengas que decir una palabra." },
      { title: "No se muere en una semana", text: "Es una rosa natural preservada: mantiene su color y su forma de 3 a 5 años, sin agua ni cuidados." },
      { title: "Llega lista para entregar", text: "Cúpula de cristal, base negra y lazo Bruval. Tú solo la entregas, o la llevamos nosotros." },
    ],
    includes: [
      "Rosa preservada talla Extra Large en el color que elijas, con tallo y hojas",
      "Cúpula de cristal con base negra",
      "Musgo y detalles decorativos preservados",
      "Lazo Bruval y tarjeta con tu mensaje",
    ],
    faqs: [
      { question: "¿Cuánto dura la rosa?", answer: "De 3 a 5 años, si la mantienes dentro de la cúpula, lejos del sol directo y de la humedad. No necesita agua ni ningún cuidado." },
      { question: "¿En qué colores viene?", answer: "Rojo, blanco, rosado, lila, morado, fucsia y azul. Todos tienen el mismo precio: eliges el color antes de comprar." },
      warrantyFaq,
      deliveryFaq,
      cardFaq,
      paymentFaq,
    ],
  },
  {
    slug: "ramo-rosas-preservadas",
    productSlug: "ramo-rosas-preservadas",
    name: "Jarrón de rosas preservadas",
    eyebrow: "Rosas rojas en florero de cerámica",
    lead: "Haz la cuenta: un ramo normal se bota a la semana. Este son rosas rojas preservadas que duran de 3 a 5 años, ya armadas en un florero de cerámica blanca con lazo rojo. Sin agua, sin buscar dónde ponerlo.",
    seoDescription: "Jarrón de rosas rojas preservadas en florero de cerámica con lazo. Dura de 3 a 5 años sin agua y tiene 6 meses de garantía. Envío gratis en Guayaquil.",
    images: gallery("ramo-rosas-preservadas", [
      "Ramo de rosas rojas preservadas en florero de cerámica blanca con lazo rojo",
      "Ramo de rosas preservadas visto de frente",
      "Ramo de rosas preservadas con detalles florales rojos",
      "Ramo de rosas preservadas visto de lado",
      "Florero de cerámica blanca con forma de ramo y lazo rojo",
    ]),
    highlights: ["Dura de 3 a 5 años", "Garantía de 6 meses", "Florero incluido", "Envío gratis"],
    reasonsTitle: "Un ramo que no termina en la basura.",
    reasons: [
      { title: "Haz la cuenta", text: "Un ramo natural dura 7 días. Este se queda en su escritorio o en su cuarto de 3 a 5 años, recordándole quién se lo dio." },
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
      { question: "¿Cuánto duran las rosas?", answer: "De 3 a 5 años, si las mantienes lejos del sol directo y de la humedad. No necesitan agua; solo quítales el polvo con suavidad de vez en cuando." },
      { question: "¿Viene en otros colores?", answer: "El jarrón viene en rosas rojas. Si buscas otro color, mira la rosa de La Bella y la Bestia: viene en 7 colores." },
      warrantyFaq,
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
    lead: "Una rosa roja o un girasol de verdad, preservado dentro de una esfera transparente, para sus llaves, su mochila o su cartera. Llega en caja Bruval. El detalle perfecto para cuando todavía no es el momento del ramo grande.",
    seoDescription: "Llavero con rosa roja o girasol preservado en esfera transparente, en caja de regalo Bruval. 6 meses de garantía. Envío gratis en Guayaquil.",
    images: gallery("llavero-rosa-preservada", [
      "Llavero con rosa roja preservada en esfera transparente y pompones rosados",
      "Llavero con rosa preservada dentro de su caja azul Bruval",
      "Llavero con rosa preservada en la caja abierta, vista desde arriba",
      "Caja de regalo Bruval abierta con el llavero de rosa",
      "Caja de regalo azul Bruval cerrada",
    ]),
    colors: [
      { name: "Rosa roja", swatch: "#b3122e" },
      { name: "Girasol", swatch: "#f2b705" },
    ],
    highlights: ["Rosa o girasol natural", "Garantía de 6 meses", "Caja de regalo", "Envío gratis"],
    reasonsTitle: "Va con ella a todas partes.",
    reasons: [
      { title: "Lo ve todos los días", text: "Cada vez que saca las llaves o abre la cartera, se acuerda de ti." },
      { title: "Flor real, no de plástico", text: "Es una flor natural preservada dentro de una esfera transparente. Mantiene su color de 3 a 5 años." },
      { title: "Precio de detalle, cara de regalo", text: "Llega en la caja azul de Bruval, lista para entregar. Ideal para un aniversario de meses o un \"porque sí\"." },
    ],
    includes: [
      "Rosa roja o girasol preservado en esfera transparente",
      "Hoja decorativa y pompones rosados",
      "Argolla y mosquetón dorados",
      "Caja de regalo Bruval y tarjeta con tu mensaje",
    ],
    faqs: [
      { question: "¿La flor es natural?", answer: "Sí. Es una rosa o un girasol natural preservado, sellado dentro de la esfera para que no se dañe con el uso diario. Dura de 3 a 5 años." },
      { question: "¿Rosa o girasol cuestan lo mismo?", answer: "Sí, los dos tienen el mismo precio. Eliges cuál quieres antes de comprar." },
      warrantyFaq,
      deliveryFaq,
      cardFaq,
      paymentFaq,
    ],
  },
];

export function landingBySlug(slug?: string) {
  return slug ? landings.find((landing) => landing.slug === slug) : undefined;
}
