package controllers;

import java.lang.reflect.Type;
import java.util.List;

import models.Rule;
import models.Rule.RuleError;
import models.User;
import play.Logger;
import play.mvc.Controller;
import play.mvc.With;
import rules.RuleUtils;

import com.google.common.collect.Lists;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

@With(Login.class)
public class Rules extends Controller {
    
    private static final int MAX_NUM_RULES = 200;
    
    public static void update(String rules) {
        checkAuthenticity();
        Type t = new TypeToken<List<Rule>>(){}.getType();
        List<Rule> ruleList = new Gson().fromJson(rules, t);
        
        if (ruleList != null && ruleList.size() > MAX_NUM_RULES) {
            //TODO:
            //  1. preemptively check the count on the client side
            //  2. we should display an appropriate error message
            //     rather than issuing 400 error
            Logger.warn("User missing rule list or too many rules.");
            badRequest();
        }

        User user = Login.getLoggedInUser();
        List<List<RuleError>> allErrors = Lists.newArrayList();

        if (Rule.insertAll(user, ruleList, allErrors)) {
            Logger.info("New rules inserted with no errors so running rules.");
            RuleUtils.runRules(user);
        }

        renderJSON(allErrors);
    }
}
