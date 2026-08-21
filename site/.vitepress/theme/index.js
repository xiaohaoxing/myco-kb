import DefaultTheme from 'vitepress/theme'
import TerminalDemo from './components/TerminalDemo.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('TerminalDemo', TerminalDemo)
  },
}
