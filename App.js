Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    _onIterationChanged: function(combo) {
        var grid = this.down('rallygrid');
        var store = grid.getStore();
        store.clearFilter(true);
        store.filter(this._getFilter());
        console.log('iteration', combo.getValue());
    },

    onProjectSelected:function(combobox){
        console.log('project', combobox.getSelectedRecord().get('_ref'));
        this.down('rallyiterationcombobox').setProject(combobox.getSelectedRecord().get('_ref'));
    },

    _getFilter: function () {
        var filter = [];

        filter.push({
            property: 'Iteration',
            operator: '=', 
            value: this.down("rallyiterationcombobox").getValue()
        });

        return filter;
    },

    launch: function () {
        console.log("First app worsk!");

        var widgetPanel = Ext.create('Ext.Panel', {
            itemId: 'widget',
            layout: {
                type: 'hbox',
                align: 'middle'
            },

            items:[
                {
                    fieldLabel: "Select project",
                    itemId: "rallyprojectpicker",
                    showMostRecentlyUsedProjects: false,
                    workspace: this.getContext().getWorkspaceRef(),
                    xtype: 'rallyprojectpicker',
                    value: this.getContext().getProject()._ref,
                    // listeners: {
                    //     change: this.onProjectSelected,
                    //     scope: this
                    // },
                    width: 300,
                    margin: 20
                },
                {
                    fieldLabel: "Select release",
                    xtype: 'rallyreleasecombobox',
                    itemId: "rallyreleasecombobox"
                },
                {
                    fieldLabel: 'Select iteration',
                    xtype: 'rallyiterationcombobox',
                    itemId: "rallyiterationcombobox",
                    listeners: {
                        select: this._onIterationChanged,
                        scope: this
                    }
                }

            ]
        });

        var myGrid = Ext.create('Ext.Container', {
            store: myStore,
            items: [{
                xtype: 'rallygrid',
                columnCfgs: [
                    'FormattedID',
                    'Name',
                    'Owner',
                    'ScheduleState'
                ],
                storeConfig: {
                    model: 'userstory'
                }
            }],
            renderTo: Ext.getBody()
        });

        var myStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'User Story',
            autoLoad: true,
            listeners: {
                load: function (myStore, myData, success) {
                    console.log("Got data");
                }
            },
            fetch: ['FormattedID', 'Name', 'Owner', 'ScheduleState']
        });

        this.add(widgetPanel);
        this.add(myGrid);
    }
});
