import DefaultTheme from 'vitepress/theme'
import HomeHero from './components/HomeHero.vue'
import TerminalDemo from './components/TerminalDemo.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomeHero', HomeHero)
    app.component('TerminalDemo', TerminalDemo)
  },
}
