Ext.define('DDN.validation.BaseRule',{
    extend: 'Ext.Base',
    
    config: {
        /*
        * [{Rally.wsapi.data.Model}] portfolioItemTypes the list of PIs available
        * we're going to use the first level ones (different workspaces name their portfolio item levels differently)
        */
        portfolioItemTypes:[],
        /**
         * 
         * @cfg
         * {String} model The name of a record type that this rule applies to 
         */
        model: null,
        /**
         * 
         * @cfg {String} a human-readable label for the chart that will be made from the rule
         */
        label: 'No label supplied for this rule'
    },

    constructor: function(config) {
        this.mergeConfig(config);
    },
    
    shouldExecuteRule: true,
    
    getDescription: function() {
        console.error('getRuleDescription is not implemented in subclass ', this.self.getName());
        return null;
    },
    
    getFetchFields: function() {
        return [];
    },
    getLabel: function() {
        console.error('getLabel is not implemented in subclass ', this.self.getName());
        return this.label; 
    },
    getModel: function() {
        return this.model;
    },

    getFilters: function() {
        console.error('getFilters not implemented in subclass ', this.self.getName());
        throw 'getFilters not implemented in subclass ' + this.self.getName();
    },
    // return false if the record doesn't match
    // return string if record fails the rule
    applyRuleToRecord: function(record) {
        console.error('applyRuleToRecord not implemented in subclass ', this.self.getName());
        throw 'applyRuleToRecord not implemented in subclass ' + this.self.getName();
        
        return record;
    },
    
    /* override to allow the validator to check if the rule makes sense to run 
     * (e.g., the field checker for fields that don't even exist)
     * 
     * resolve promise with text if problem -- the validator will return the text so
     * it can be put into a description
     * 
     * The rule will still be executed unless this.shouldExecuteRule is set to false (and
     * the rule class implements skipping because of this.shouldExecuteRule).
     * 
     * A rule class could be multi-part and only partially fail, so execution or not execution
     * needs to be handled by the class itself.
     * 
     */
    precheckRule: function() {
        return null;
    },
    
    getUserFriendlyRuleLabel: function() {        
        return this.label || this.getLabel();
    }
});