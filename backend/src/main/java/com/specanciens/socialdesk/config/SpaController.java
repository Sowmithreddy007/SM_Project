package com.specanciens.socialdesk.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the React single-page application for every client-side route.
 *
 * <p>API, actuator, H2 console, static assets and files with an extension are
 * excluded so they keep their normal handling.</p>
 */
@Controller
public class SpaController {

    private static final String FIRST_SEGMENT =
            "^(?!api$|actuator$|assets$|h2-console$|error$)(?!.*\\.).*$";

    @GetMapping({
            "/{path:" + FIRST_SEGMENT + "}",
            "/{path:" + FIRST_SEGMENT + "}/**"
    })
    public String index() {
        return "forward:/index.html";
    }
}
