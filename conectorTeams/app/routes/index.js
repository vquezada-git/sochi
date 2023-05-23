module.exports = (app, router) => {
    const controllers = require('../controllers');

    router.post('/conversation', controllers.conversation);
    app.use('/', router);
}
