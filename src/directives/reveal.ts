import type { Directive } from 'vue'

/**
 * v-reveal: el elemento entra con fundido al aparecer en pantalla y se desvanece al salir.
 * `v-reveal="120"` retrasa la entrada en ms (para escalonar tarjetas).
 */
const observer =
  typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const entry of entries) entry.target.classList.toggle('is-visible', entry.isIntersecting)
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      )

export const reveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
    if (observer) observer.observe(el)
    else el.classList.add('is-visible')
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
