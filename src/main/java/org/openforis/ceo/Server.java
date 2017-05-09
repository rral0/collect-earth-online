package org.openforis.ceo;

import freemarker.template.Configuration;
import freemarker.template.TemplateExceptionHandler;
import java.io.File;
import java.net.URL;
import spark.servlet.SparkApplication;
import spark.template.freemarker.FreeMarkerEngine;
import static spark.Spark.exception;
import static spark.Spark.get;
import static spark.Spark.port;
import static spark.Spark.post;
import static spark.Spark.staticFileLocation;

public class Server implements SparkApplication {

    // Returns a FreeMarkerEngine object configured to read *.ftl
    // files from src/main/resources/template/freemarker/
    private static FreeMarkerEngine getTemplateRenderer() {
        try {
            Configuration cfg = new Configuration(Configuration.VERSION_2_3_23);
            URL templateDirectory = Server.class.getResource("/template/freemarker");
            cfg.setDirectoryForTemplateLoading(new File(templateDirectory.toURI()));
            cfg.setDefaultEncoding("UTF-8");
            cfg.setTemplateExceptionHandler(TemplateExceptionHandler.HTML_DEBUG_HANDLER);
            // cfg.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
            cfg.setLogTemplateExceptions(false);
            return new FreeMarkerEngine(cfg);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // Sets up Spark's routing table and exception handling rules
    private static void declareRoutes() {
        // Configure FreeMarker
        FreeMarkerEngine freemarker = getTemplateRenderer();

        // FIXME: Get deploy/clientkeystore signed by a certificate authority.
        // https://docs.oracle.com/cd/E19509-01/820-3503/ggfen/index.html
        // secure("deploy/clientkeystore", "ceocert", null, null);

        // Serve static files from src/main/resources/public/
        staticFileLocation("/public");

        // Setup Routes
        get("/",                                 (req, res) -> { return freemarker.render(Views.home(req, res)); });
        get("/home",                             (req, res) -> { return freemarker.render(Views.home(req, res)); });
        get("/about",                            (req, res) -> { return freemarker.render(Views.about(req, res)); });
        get("/tutorials",                        (req, res) -> { return freemarker.render(Views.tutorials(req, res)); });
        get("/demo",                             (req, res) -> { return freemarker.render(Views.demo(req, res)); });
        get("/account",                          (req, res) -> { return freemarker.render(Views.account(req, res)); });
        post("/account",                         (req, res) -> { return freemarker.render(Views.account(AJAX.updateAccount(req, res), res)); });
        get("/dashboard",                        (req, res) -> { return freemarker.render(Views.dashboard(req, res)); });
        get("/admin",                            (req, res) -> { return freemarker.render(Views.admin(req, res)); });
        post("/admin",                           (req, res) -> { return freemarker.render(Views.admin(AJAX.createNewProject(req, res), res)); });
        get("/login",                            (req, res) -> { return freemarker.render(Views.login(req, res)); });
        post("/login",                           (req, res) -> { return freemarker.render(Views.login(AJAX.login(req, res), res)); });
        get("/register",                         (req, res) -> { return freemarker.render(Views.register(req, res)); });
        post("/register",                        (req, res) -> { return freemarker.render(Views.register(AJAX.register(req, res), res)); });
        get("/password",                         (req, res) -> { return freemarker.render(Views.password(req, res)); });
        post("/password",                        (req, res) -> { return freemarker.render(Views.password(AJAX.requestPasswordResetKey(req, res), res)); });
        get("/password-reset",                   (req, res) -> { return freemarker.render(Views.passwordReset(req, res)); });
        post("/password-reset",                  (req, res) -> { return freemarker.render(Views.passwordReset(AJAX.resetPassword(req, res), res)); });
        get("/logout",                           (req, res) -> { return freemarker.render(Views.home(AJAX.logout(req), res)); });
        get("/get-all-projects",                 (req, res) -> { return AJAX.getAllProjects(req, res); });
        post("/get-project-plots",               (req, res) -> { return AJAX.getProjectPlots(req, res); });
        post("/dump-project-aggregate-data",     (req, res) -> { return AJAX.dumpProjectAggregateData(req, res); });
        post("/archive-project",                 (req, res) -> { return AJAX.archiveProject(req, res); });
        post("/add-user-samples",                (req, res) -> { return AJAX.addUserSamples(req, res); });
        post("/flag-plot",                       (req, res) -> { return AJAX.flagPlot(req, res); });
        get("/geo-dash",                         (req, res) -> { return freemarker.render(Views.geodash(req, res)); });
        get("/geo-dash/id/:id",                  (req, res) -> { return AJAX.geodashId(req, res); });
        get("/geo-dash/update/id/:id",           (req, res) -> { return AJAX.updateDashBoardByID(req, res); });
        get("/geo-dash/createwidget/widget",     (req, res) -> { return AJAX.createDashBoardWidgetByID(req, res); });
        get("/geo-dash/updatewidget/widget/:id", (req, res) -> { return AJAX.updateDashBoardWidgetByID(req, res); });
        get("/geo-dash/deletewidget/widget/:id", (req, res) -> { return AJAX.deleteDashBoardWidgetByID(req, res); });
        get("*",                                 (req, res) -> { return freemarker.render(Views.pageNotFound(req, res)); });

        // Handle Exceptions
        exception(Exception.class, (e, req, rsp) -> e.printStackTrace());
    }

    // Maven/Gradle entry point for running with embedded Jetty webserver
    public static void main(String[] args) {
        // Set the webserver port
        port(8080);

        // Set up the routing table
        declareRoutes();
    }

    // Tomcat entry point
    public void init() {
        // Set up the routing table
        declareRoutes();
    }

}

/*
  before("/protected/*", (request, response) -> {
  boolean authenticated = false;
  // ... check if authenticated
  if (!authenticated) {
  halt(401, "Go Away!");
  }
  });

  after((request, response) -> {
  response.header("foo", "set by after filter");
  });

*/
