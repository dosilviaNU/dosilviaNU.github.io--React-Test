/**
 * Created by dsilv on 7/5/2017.
 */
$(document).ready(function(){
    function FilteringViewModel(){
         var self = this;

        /**
         * When a filter is applied filteredArray is used to generate the displayed array,
         * otherwise the rolesAuths array is used.
         */
        //Array for ALL roleAuthorizations.
        self.rolesAuths = ko.observableArray().extend({deferred: true});
        //Filtered subset of rolesAuths array.
        self.filteredArray = ko.observableArray();
        //Array tracking which filters are applied.
        self.appliedFilters = ko.observableArray();

        /**
         * *****FILTER OBSERVABLES******
         * All filters have the following fields:
         * filterOptions: Options selected by the user to filter by.
         * filterType: The type of filter being applied, i.e. Application, Role, User.
         * items: All values for this filters field within rolesAuth or filteredArray. Used to generate set of
         * unique values for user options.
         * field: The field associated with this filter type, i.e. .role() etc, used in eval call.
         * filterLevel: One of {applicationCodeFilterLevel, roleFilterLevel, userFilterLevel}
         *
         * All filters have a subscription that calls applyFilters only when a filter is changed from null.
         */
        self.primaryFilter = ko.observable(null);
        self.secondaryFilter = ko.observable(null);
        self.tertiaryFilter = ko.observable(null);


        //Current filter level {1, 2, 3}
        self.currentFilterLevel = ko.observable(0);
        //Each field tracks its individual filter level, one of{'primary', 'secondary', 'tertiary'}
        self.applicationCodeFilterLevel = ko.observable(null);
        self.roleFilterLevel = ko.observable(null);
        self.userFilterLevel = ko.observable(null);

        //Is a filter currently being applied, true if currentFilterLevel > 0, false o.w.
        self.filtered = ko.computed(function () {
            if (self.currentFilterLevel() > 0) {
                return true;
            }
            else {
                return false;
            }
        }, self);

        //If no filter is applied use the rolesAuths array for sorting, o.w. use the filteredArray.
        self.sortingArray = ko.computed(function () {
            return self.filtered() ? self.filteredArray : self.rolesAuths;
        }, self);

        /**
         * *****FILTERABLE FIELDS*****
         * Each filterable field has 4 associated observables:
         * all[Field]: Observable array containing all instances of field. Subscription to this updates
         * the unique array of this field.
         * unique[Field]: Set of all[Field].
         * [field]SelectedOptions: Observable array that contains selected user options. Subscription to this calls the
         * the optionUpdated method, which will determine whether to begin the removeFilterSequence
         * or applyFilterSequence.
         **/
        self.allApplicationCodes = ko.observableArray().extend({deferred: true});
        self.select2AppCodes = null; //Array to prevent select2 from adding to actual array.
        self.uniqueApplicationCodes = ko.computed(function () {
            self.select2AppCodes = ko.utils.arrayGetDistinctValues(self.allApplicationCodes()).sort();
            return self.select2AppCodes;
        }, self);
        self.applicationCodeSelectedOptions = ko.observableArray();
        self.applicationCodeSelectedOptions.subscribe(function () {
            self.optionUpdated(self.applicationCodeSelectedOptions, self.applicationCodeFilterLevel, 'Application', self.allApplicationCodes, '.applicationCode()');
        });

        self.allRoles = ko.observableArray().extend({deferred: true});
        self.select2Roles = null;
        self.uniqueRoles = ko.computed(function () {
            self.select2Roles = ko.utils.arrayGetDistinctValues(self.allRoles()).sort();
            return self.select2Roles;
        });
        self.roleSelectedOptions = ko.observableArray();
        self.roleSelectedOptions.subscribe(function () {
            self.optionUpdated(self.roleSelectedOptions, self.roleFilterLevel, 'Role', self.allRoles, '.role()');
        });

        self.allNames = ko.observableArray().extend({deferred: true});
        self.uniqueNames = ko.computed(function () {
            return ko.utils.arrayGetDistinctValues(self.allNames()).sort();
        });
        self.nameSelectedOptions = ko.observableArray();
        self.nameSelectedOptions.subscribe(function () {
            self.optionUpdated(self.nameSelectedOptions, self.userFilterLevel, 'Name', self.allNames, '.name()');
        });

        self.allUserNames = ko.observableArray().extend({deferred: true});
        self.select2Users = null;
        self.uniqueUsersNames = ko.computed(function () {
            self.select2Users = ko.utils.arrayGetDistinctValues(self.allUserNames()).sort();
            return self.select2Users;
        });


        var names = ["David", "Joe", "Bob", "Kevin"];
        var roles = ["User", "Admin", "Guest", "Supervisor"];
        var apps = ["Diablo", "Horizons", "Pac-Man", "Frogger"];

        names.forEach(function(name){
            roles.forEach(function(role){
                apps.forEach(function(app){
                    var temp = new RolesAuth();
                    temp.constructDummy(name,role, app);
                    self.rolesAuths.push(temp);
                    self.allNames.push(name);
                    self.allRoles.push(role);
                    self.allApplicationCodes.push(app);
                    console.log(temp);
                })
            })

        });


        /**
         * *****FILTERING FUNCTIONS*****
         */

        //Entry function into applyFilter/removeFilterSequences, determines wheter to apply or remove filter based

        self.optionUpdated = function (selectedOptions, filterLevel, filterType, allItems, functionCall) {
            if (selectedOptions().length == 0) {
                self.removeFilterSequence(filterLevel, filterType);
            }
            else {
                self.applyFilterSequence(selectedOptions, filterLevel, filterType, allItems, functionCall);
            }
        };

        //Updates currentFilterLevel to appropriate level, and assigns given field the appropriate filterLevel, creates
        //appropriate Filter object using given filterable field parameters.
        //Called when a filter is initially applied with apply: true, called with apply: false when every a
        //filterable fields options are adjusted by user.
        self.applyFilterSequence = function (options, level, type, allItems, field) {
            if (level() == null) { //If
                self.appliedFilters.push(type);
                switch (self.currentFilterLevel()) {
                    case 0:
                        self.currentFilterLevel(1);
                        self.setFilter(self.primaryFilter, options, level, type, allItems, field);
                        level('primary');
                        break;
                    case 1:
                        self.currentFilterLevel(2);
                        self.setFilter(self.secondaryFilter, options, level, type, allItems, field);
                        level('secondary');
                        break;
                    case 2:
                        self.currentFilterLevel(3);
                        self.setFilter(self.tertiaryFilter, options, level, type, allItems, field);
                        level('tertiary');
                        break;
                }
            }
            self.applyFilters();
            self.fixOptionsArrays();
        };

        //Applies all filters in appropriate order, called anytime a filtererable fields options are updated.
        self.applyFilters = function () {
            if (self.primaryFilter() != null) {
                self.filterApplication(self.primaryFilter, self.rolesAuths);
            }
            if (self.secondaryFilter() != null) {
                self.filterApplication(self.secondaryFilter, self.filteredArray);

            }
            if (self.tertiaryFilter() != null) {
                self.filterApplication(self.tertiaryFilter, self.filteredArray);
            }
        };

        //Adjusts filterable fields available options depending on currentFilterLevel and applied filters.
        //Called as part of the applyFilterSequence and removeFilterSequence.
        self.fixOptionsArrays = function () {
            if (self.filtered()) {
                if (self.currentFilterLevel() == 1) {
                    var tempFilterArray = [];
                    if (self.secondaryFilter() != null) {
                        self.secondaryFilter().items.removeAll();
                        tempFilterArray.push(self.secondaryFilter);
                    }
                    if (self.tertiaryFilter() != null) {
                        self.tertiaryFilter().items.removeAll();
                        tempFilterArray.push(self.tertiaryFilter);
                    }
                    if (tempFilterArray.length == 0) {
                        tempFilterArray = self.getUnusedFilters();
                    }
                    for (var i = 0; i < self.filteredArray().length; i++) {
                        for (var j = 0; j < tempFilterArray.length; j++) {
                            var tempFilter = tempFilterArray[j];
                            tempFilter().items.push(eval("self.filteredArray()[" + i + "]" + tempFilter().field));
                        }
                    }
                }
                else if (self.currentFilterLevel() == 2) {
                    if (self.tertiaryFilter() != null) {
                        var filter = self.tertiaryFilter;
                        filter.items().removeAll();
                        for (var i = 0; i < self.filteredArray().length; i++) {
                            filter().items.push(eval("self.filteredArray()[" + i + "]" + filter().field));
                        }
                    }
                    else {
                        var tempArray = self.getUnusedFilters();
                        var filter = tempArray[0];
                        for (var i = 0; i < self.filteredArray().length; i++) {
                            filter().items.push(eval("self.filteredArray()[" + i + "]" + filter().field));
                        }
                    }
                }
            }
            else {
                self.allApplicationCodes.removeAll();
                self.allNames.removeAll();
                self.allRoles.removeAll();
                for (var i = 0; i < self.rolesAuths().length; i++) {
                    self.allApplicationCodes.push(self.rolesAuths()[i].applicationCode());
                    self.allRoles.push(self.rolesAuths()[i].role());
                    self.allNames.push(self.rolesAuths()[i].name());
                }
            }
        };

        //Returns an array of the currently unused filters. Used as a helper function to fixOptionArrays.
        self.getUnusedFilters = function () {
            var tempFilterArray = [];
            if (self.applicationCodeSelectedOptions().length == 0) {
                self.allApplicationCodes.removeAll();
                tempFilterArray.push(ko.observable({items: self.allApplicationCodes, field: '.applicationCode()'}));
            }
            if (self.roleSelectedOptions().length == 0) {
                self.allRoles.removeAll();
                tempFilterArray.push(ko.observable({items: self.allRoles, field: '.role()'}));
            }
            if (self.nameSelectedOptions().length == 0) {
                self.allNames.removeAll();
                tempFilterArray.push(ko.observable({items: self.allNames, field: '.name()'}));
            }
            return tempFilterArray;
        };

        //Remove filter sequence to ensure observables are updated in the appropriate order.
        self.removeFilterSequence = function (filterLevel, type) {
            self.appliedFilters.remove(type);
            self.removeFilter(filterLevel);
            self.applyFilters();
            self.fixOptionsArrays();
        };


        //Removes the passed in filterLevel{'primary', 'secondary', 'tertiary'}
        self.removeFilter = function (filterLevel) {
            if (typeof filterLevel == "function") {
                level = filterLevel();
            }
            else {
                level = filterLevel;
            }
            if (level == 'primary') {
                switch (self.currentFilterLevel()) {
                    case 1:
                        self.currentFilterLevel(0);
                        self.swapFilter(self.primaryFilter, null);
                        break;
                    case 2:
                        self.currentFilterLevel(1);
                        self.swapFilter(self.primaryFilter, self.secondaryFilter);
                        break;
                    case 3:
                        self.currentFilterLevel(2);
                        self.swapFilter(self.primaryFilter, self.secondaryFilter);
                        self.secondaryFilter(self.tertiaryFilter());
                        self.secondaryFilter().filterLevel('secondary');
                        self.tertiaryFilter(null);
                }
                return;
            }
            if (level == 'secondary') {
                if (self.currentFilterLevel() > 2) {
                    self.currentFilterLevel(2);
                    self.swapFilter(self.secondaryFilter, self.tertiaryFilter);
                }
                else {
                    self.currentFilterLevel(1);
                    self.swapFilter(self.secondaryFilter, null);
                }
                return;
            }
            if (level == 'tertiary') {
                self.currentFilterLevel(2);
                self.swapFilter(self.tertiaryFilter, null);

            }
        };

//Helper function to assist in upgrading a filter level. i.e. secondaryFilter -> primaryFilter
        self.swapFilter = function (oldFilter, newFilter) {
            self.appliedFilters.remove(oldFilter().filterType);
            if (newFilter != null && newFilter() != null) {
                newFilter().filterLevel(oldFilter().filterLevel());
                oldFilter().filterLevel(null);
                oldFilter(newFilter());
                newFilter(null);
                self.fixOptionArray(oldFilter);
            }
            else {
                oldFilter().filterLevel(null);
                oldFilter(null);
            }
        };

//Helper function to update an individual filters set of options. A targeted version of
//fixOptionArrays.
        self.fixOptionArray = function (filter) {
            if (filter().filterLevel() == 'primary') {
                filter().items.removeAll();
                for (var i = 0; i < self.rolesAuths().length; i++) {
                    filter().items.push(eval("self.rolesAuths()[" + i + "]" + filter().field));
                }
            }
            else {
                filter().items.removeAll();
                for (var i = 0; i < self.filteredArray().length; i++) {
                    filter().items.push(eval("self.filteredArray()[" + i + "]" + filter().field));
                }
            }
        };

        self.getItemValue = function (item, filterType) {
            switch (filterType) {
                case 'Application':
                    return item.applicationCode();
                case 'Name':
                    return item.name();
                case 'Role':
                    return item.role();
            }
        };

        self.copyObservableArray = function (toCopy) {
            var temp = [];
            for (var i = 0; i < toCopy().length; i++) {
                temp[i] = toCopy()[i];
            }
            return temp;
        };

        // all applied filters.
        self.clearFilters = function () {
            if (self.tertiaryFilter() != null) {
                self.tertiaryFilter().items.removeAll();
            }
            if (self.secondaryFilter() != null) {
                self.secondaryFilter().items.removeAll();
            }
            if (self.primaryFilter() != null) {
                self.primaryFilter().items.removeAll();
            }
        };


        self.setFilter = function (filter, options, level, type, allItems, field) {
            filter({
                filterOptions: options,
                filterLevel: level,
                filterType: type,
                items: allItems,
                field: field
            })
        };


        self.filterApplication = function (filter, array) {
            var tempArray = self.copyObservableArray(array);
            tempArray = tempArray.filter(function (item) {
                return filter().filterOptions().indexOf(self.getItemValue(item, filter().filterType)) > -1;
            });
            self.filteredArray.removeAll();
            ko.utils.arrayPushAll(self.filteredArray, tempArray);
        };

        self.displayArray = ko.computed(function () {
            return self.filtered() ? self.filteredArray() :
                self.rolesAuths();
        }, self);
    }

    ko.bindingHandlers.chosen = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext){
            var $element = $(element);
            var options = ko.unwrap(valueAccessor());

            if (typeof options === 'object')
                $element.chosen();
            else
                $element.chosen();

            ['options', 'selectedOptions', 'value'].forEach(function(propName){
                if (allBindings.has(propName)){
                    var prop = allBindings.get(propName);
                    if (ko.isObservable(prop)){
                        prop.subscribe(function(){
                            $element.trigger('chosen:updated');
                        });
                    }
                }
            });
        }
    };

    var vm = new FilteringViewModel();
    ko.applyBindings(vm);

    //RolesAuth
    function RolesAuth() {
        var self = this;
        self.name = ko.observable();
        self.applicationCode = ko.observable();
        self.role = ko.observable();

        self.constructDummy = function (name, role, applicationCode) {
            self.name(name);
            self.role(role);
            self.applicationCode(applicationCode);
        };
    };




});





