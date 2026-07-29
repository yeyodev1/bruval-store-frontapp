<template>
  <main class="not-found">
    <a href="/" class="brand">bruval<span>.</span></a>
    <section>
      <p class="eyebrow">Error 404</p>
      <h1>Esta flor<br><i>no existe.</i></h1>
      <p>La página que buscas no está disponible o el enlace ya no es válido.</p>
      <a href="/" class="button">Volver a la tienda <span>→</span></a>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.not-found { min-height:100vh; box-sizing:border-box; padding:30px 5vw; color:#211817; background:#e7d2c7; display:flex; flex-direction:column; } .brand { color:inherit; text-decoration:none; font:600 31px/1 $font-secondary; letter-spacing:-2px; } .brand span,.eyebrow { color:#9a4f58; } section { width:min(650px,100%); margin:auto; } .eyebrow { margin:0 0 18px; font:500 10px $font-principal; letter-spacing:1.7px; text-transform:uppercase; } h1 { margin:0; font:500 clamp(64px,9vw,120px)/.8 $font-secondary; letter-spacing:-.07em; } h1 i { padding-left:8vw; } section > p:not(.eyebrow) { max-width:370px; margin:42px 0 28px; color:#564643; line-height:1.6; } .button { min-width:220px; display:flex; justify-content:space-between; padding:16px 18px; color:#fffaf6; background:#9a4f58; text-decoration:none; font:600 12px $font-principal; } .button span { font-size:20px; }
</style>
