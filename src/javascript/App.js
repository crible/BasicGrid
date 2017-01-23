Ext.define('DDNValidationApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    defaults: { margin: 10 },
    MAX_LIMITS:{CATEGORIES: 30},

    items: [
        { //filter box
            xtype:'container',
            itemId:'filters_box',
            layout: {
                type: 'hbox',
                columnWidth: '100%'
            }
        },    // end of filter box

        { // main chart display  
            xtype:'container',
            itemId:'display_box'
        }
    ], // end of app containers

    integrationHeaders : {
        name : "DDNValidationApp"
    },

    getSettingsFields: function() {
         return [
         {  
            name: 'rootPortfolioProject',
            xtype: 'rallytextfield',
            fieldLabel: 'Name of root Portfolio Item project:'
         },
         { 
            name: 'showSchedulable',
            xtype: 'rallycheckboxfield',
            boxLabelAlign: 'after',
            fieldLabel: '',
            margin: '0 0 25 200',
            boxLabel: 'Show only schedulable artifacts: User Stories, Defects and Tasks.'
         }
         ];
    },

    config: {
        defaultSettings: {
            rootPortfolioProject: 'Global Development',
            showSchedulable: true           
        }
    },

    rulesByType: {
        HierarchicalRequirement: [
            {xtype:'ddnstorynoplanestimaterule' },
            {xtype:'ddnartifactactivenoiterationrule', model: 'HierarchicalRequirement' },
            {xtype:'ddnstorycompletednoactuals', model: 'HierarchicalRequirement'}

        ],
        Task: [
            {xtype:'ddntaskactivenotodorule' },
            {xtype:'ddntaskcompletednoactuals'}
        ],
        Defect: [
            {xtype:'ddndefectclosednoresolutionrule'}
        ]
    },

    launch: function() {
        console.log("It works!");
        this._doLayout();
        // get any data model customizations ... then get the data and render the chart
        this._fetchPortfolioItemTypes().then({
            success: this._initializeApp, 
            failure: this._showErrorMsg,
            scope: this
        });
    },


    _doLayout: function(){
        var me = this;
        // add checkbox panel to select rules
        this.down('#filters_box').add([
            {
                xtype: 'panel',
                title: 'Rule(s)',
                itemId: 'selectRulesPanel',
                layout:{
                    type: 'hbox',
                    align: 'left'
                },
                height: 80,
            },
        ]);
        if (!this.getSetting('showSchedulable')){
            // update the filters-box title (no selection offered)
            this.down('#selectRulesPanel').setTitle('Rule');

            // only show high-level portfolio rules
            this.down('#selectRulesPanel').add([
                {
                    xtype: 'rallycheckboxfield',
                    columnWidth: '25%',
                    margin: 10,
                    labelSeparator: " ",
                    boxLabel: 'Portfolio',
                    boxLabelAlign: 'after',
                    name: 'portfolioRules',
                    itemId: 'portfolioRuleCheckBox',
                    stateful: true,
                    stateId: 'portfolioRuleCheckBox',
                    stateEvents: ['change'],
                    //disabled: true,
                    readOnly: true, // a little nicer display than disabled.
                    value: true
                },
            ]);
        } else {
            // update the selectRulesPanel title ('Select Rules')
            this.down('#selectRulesPanel').setTitle('Select Rules to Display');

            // show Stories/Defects/Tasks (no Feature Rules so far)
            this.down('#selectRulesPanel').add([
                {
                    xtype: 'rallycheckboxfield',
                    columnWidth: '25%',
                    margin: 10,
                    boxLabel: 'User Story',
                    boxLabelAlign: 'after',
                    name: 'storyRules',
                    itemId: 'storyRuleCheckBox',
                    stateful: true,
                    stateId: 'userStoryRuleCheckBox',
                    stateEvents: ['change'],
                    value: true
                },
                {
                    xtype: 'rallycheckboxfield',
                    columnWidth: '25%',
                    margin: 10,
                    boxLabel: 'Defect',
                    boxLabelAlign: 'after',
                    name: 'defectRules',
                    itemId: 'defectRuleCheckBox',
                    stateful: true,
                    stateId: 'defectRuleCheckBox',
                    stateEvents: ['change'],
                    value: true
                },    
                {
                    xtype: 'rallycheckboxfield',
                    columnWidth: '25%',
                    margin: 10,   
                    boxLabel: 'Task',
                    boxLabelAlign: 'after',
                    name: 'taskRules',
                    itemId: 'taskRuleCheckBox',
                    stateful: true,
                    stateId: 'taskRuleCheckBox',
                    stateEvents: ['change'],
                    value: true
                }
            ]);
        }
    },

    _initializeApp: function(portfolioItemTypes){
        var me = this;
        
        console.log('InitializeApp', portfolioItemTypes);

        // add the array of portfolioItem Type names to each portfolio rule as we instantiate it
        // also grab appSetting for a target folder to hold high-level portfolio items
        Ext.Array.each(me.rulesByType.PortfolioItemTimeboxNo, function(rule){
            // get the collection of workspace specific portfolio item names per level
            rule.portfolioItemTypes = portfolioItemTypes;
            // for rules that need to have a specific project folder for portfolio items
            rule.projectPortfolioRoot = me.getSetting('rootPortfolioProject');
        });
        
        Ext.Array.each(me.rulesByType.PortfolioItemTimeboxYes, function(rule){
            // get the collection of workspace specific portfolio item names per level
            rule.portfolioItemTypes = portfolioItemTypes;
            // for rules that need to have a specific project folder for portfolio items
            rule.projectPortfolioRoot = me.getSetting('rootPortfolioProject');
        });
        
        // add the array to the app as well.
        me.portfolioItemTypes = portfolioItemTypes;

        console.log("_initializeApp after assign:", me.rulesByType);
        
        me._loadData();
    },

     _loadData: function(){
        this.validator = this._instantiateValidator();
        
        this.validator.getPrecheckResults().then({
            scope: this,
            success: function(issues) {
                
                var messages = Ext.Array.filter(issues, function(issue){
                    return !Ext.isEmpty(issue);
                });
                
                if ( messages.length > 0 ) {
                    var append_text = "<br/><b>Precheck Issues:</b><br/><ul>";
                    Ext.Array.each(messages, function(message){
                        append_text += '<li>' + message + '</li>';
                    });
                    append_text += "</ul>";
                    
                    //this.logger.log(append_text);
                }
                
                this._updateData();
            },
            failure: function(msg) {
                Ext.Msg.alert('Problem with precheck', msg);
            }
        });
    },

    _updateData: function() {
        var me = this;
        this.setLoading("Loading data...");
        
        Deft.Chain.pipeline([
            function() { 
                me.setLoading("Gathering data...");
                return me.validator.gatherData(); 
            },
            function() { 
                me.setLoading("Analyzing data...");
                return me.validator.getChartData(); 
            }
        ]).then({
            scope: this,
            success: function(results) {
                if ( results.categories && results.categories.length === 0 ) {
                    // if no results - erase the underlying, previously rendered chart
                    //this.down('#display_box').removeAll();
                    Ext.Msg.alert('','No violations found with current selections.');
                    return;
                }
                
                this.display_rows = Ext.Object.getValues( this.validator.recordsByModel );

                this._makeChart(results);  
            },
            failure: function(msg) {
                Ext.Msg.alert('Problem loading data', msg);
            }
        }).always(function() { me.setLoading(false); });    
    }, 
 

    showDrillDown: function(records, title) {
        var me = this;

        var store = Ext.create('Rally.data.custom.Store', {
            data: records,
            pageSize: 2000
        });
        
        Ext.create('Rally.ui.dialog.Dialog', {
            id        : 'detailPopup',
            title     : title,
            width     : 500,
            height    : 400,
            closable  : true,
            layout    : 'border',
            items     : [
            {
                xtype                : 'rallygrid',
                region               : 'center',
                layout               : 'fit',
                sortableColumns      : true,
                showRowActionsColumn : false,
                showPagingToolbar    : false,
                columnCfgs           : [
                    {
                        dataIndex : 'FormattedID',
                        text: "id",
                        renderer: function(value,meta,record){
                            return Ext.String.format("<a href='{0}' target='_top'>{1}</a>",Rally.nav.Manager.getDetailUrl(record.get('_ref')),value);
                        }
                    },
                    {
                        dataIndex : 'Name',
                        text: "Name",
                        flex: 1
                    },
                    {
                        dataIndex: '__ruleText',
                        text: 'Violations',
                        flex: 2,
                        renderer: function(value, meta, record) {
                            if ( Ext.isEmpty(value) ) { return ""; }
                            var display_value = "";
                            Ext.Array.each(value, function(violation){
                                display_value = display_value + Ext.String.format("<li>{0}</li>", violation);
                            });

                            return Ext.String.format("<ul>{0}</ul>", display_value);
                        }
                    }
                ],
                store : store
            }]
        }).show();
    },

    _instantiateValidator: function() {
        var me = this;

        var rules = [];

        // ************************
        // Initiatives and Higher are not schedule-able.
        if ( me.getSetting('showSchedulable')) {

            if ( me.down('#storyRuleCheckBox').value ) {
                rules = Ext.Array.push(rules, me.rulesByType['HierarchicalRequirement']);
            }
            if ( me.down('#defectRuleCheckBox').value ) {
                rules = Ext.Array.push(rules, me.rulesByType['Defect']);
            }
            if ( me.down('#taskRuleCheckBox').value ) {
                rules = Ext.Array.push(rules, me.rulesByType['Task']);
            }     
        } else {
            if ( me.down('#portfolioRuleCheckBox').value) {
                rules = Ext.Array.push(rules, me.rulesByType['PortfolioItemTimeboxNo']);
            }
        }

        // create two different versions ... one for Timebox filtered, one without
        var validator = {};
        
        if (this.getSetting('showSchedulable')){
            var basefilter = Rally.data.wsapi.Filter.and([{property:'ObjectID',operator:'>',value:'0'}]);
            // create the validator object 
            validator = Ext.create('DDN.validator.Validator',{
                rules: rules,
                fetchFields: ['FormattedID','ObjectID'],
                // get any settings from the timebox selectors
                baseFilters:{ 
                    HierarchicalRequirement: basefilter,
                    Task: basefilter,
                    Defect: basefilter
                },
                pointEvents: {
                    click: function() {
                        me.showDrillDown(this._records,this._name);
                        console.log("showDillDown", this._records, this._name);    
                    }
                }
            });
        }

        return validator;        
    },

    _makeChart: function(data) {
        console.log('_makeChart', data);
        this.down('#display_box').removeAll();

        if (data.categories.length > this.MAX_LIMITS.CATEGORIES){
            // if there are too many projects in scope (i.e. categories) the chart is unreadable.
            var msg = Ext.String.format ("You've selected a project too high in the project hierarchy. With {0} ",data.categories.length);
            msg += "[child] projects in scope, the chart will be unusable. Please select a project ";
            msg += "further down the project hierarchy.";

            Ext.Msg.alert('Too Many Projects In Selection',msg);
            return;
        } else {
            // Go ahead and create the new chart.
            this.down("#display_box").add({
                chartData: data,
                xtype:'rallychart',
                itemId: 'validationChart',
                loadMask: false,
                chartConfig: this._getChartConfig(data)  //,
                //chartColors: colors
            });
        }
    },


    _getChartConfig: function(data) {

        var title_prefix = "";
        if ( this.down('#portfolioRuleCheckBox') ) {
            if (title_prefix.length > 0){
                title_prefix += ", ";
            }
            title_prefix = "Portfolio";
        }
        if ( this.down('#storyRuleCheckBox') ) {
            if (title_prefix.length > 0){
                title_prefix += ", ";
            }
            title_prefix += "Story";
        }
        // if the last item, use 'and' as separator, else use a comma
        if ( this.down('#defectRuleCheckBox') ) {
            if ((title_prefix.length > 0) && ( this.down('#taskRuleCheckBox')))  {
                title_prefix += ", ";
            } else {
                title_prefix += ' and ';
            }
            title_prefix += "Defect";
        }            
           
        // should be last item
        if ( this.down('#taskRuleCheckBox') ) {
            if (title_prefix.length > 0){
                title_prefix += " and ";
            }
            title_prefix += "Task";
        }
        
        return {
            chart: { type:'column' },
            title: { text: title_prefix + ' Validation Results' },
            xAxis: this._rotateProjectLabels(data.categories.length),
            yAxis: { 
                min: 0,
                title: { text: 'Count' }
            },
            tooltip: {
                positioner: function (w,h,point) {
                    return { x: point.plotX, y: point.plotY -  10 };
                }
            },
            plotOptions: {
                column: {
                    stacking: 'normal'
                }
            }
        }
    },

    _showErrorMsg: function(msg){
        Rally.ui.notify.Notifier.showError({message:msg});
    },

    _loadAStoreWithAPromise: function(model_name, model_fields){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        //this.logger.log("Starting load:",model_name,model_fields);
          
        Ext.create('Rally.data.wsapi.Store', {
            model: model_name,
            fetch: model_fields
        }).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(this);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    _displayGrid: function(store,field_names){
        this.down('#display_box').add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: field_names
        });
    },
    
    _fetchPortfolioItemTypes: function(){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            model: 'typedefinition',
            fetch:['TypePath','Ordinal'],
            filters: [{property:'TypePath',operator:'contains',value:'PortfolioItem/'}],
            sorters: [{property:'Ordinal',direction:'ASC'}]
        }).load({
            callback: function(records,operation){
                if (operation.wasSuccessful()){
                    var portfolioItemArray = [];
                    Ext.Array.each(records,function(rec){
                        portfolioItemArray.push(rec.get('TypePath'));
                    });
                    deferred.resolve(portfolioItemArray);
                } else {
                    var message = 'failed to load Portfolio Item Types ' + (operation.error && operation.error.errors.join(','));
                    deferred.reject(message);
                }
            }
        })
        
        return deferred;
    },

    _rotateProjectLabels: function(project_count){
        console.log("_rotateProjectLabels: ",project_count);
        // horizontal labels for up to 5 items
        if (project_count <= 10) {
            return {labels:{rotation:0}};
        } else if (project_count <= 20){
            return {labels:{rotation:45}};
        } else { // full vertical rotation for more than 10 items (good for up-to about 20)
            return {labels:{rotation:90}};
        }
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }


});
