import App from './app/subscribe'

const app = new App();
(async () => {
  await app.init()
  app.start()
})()
