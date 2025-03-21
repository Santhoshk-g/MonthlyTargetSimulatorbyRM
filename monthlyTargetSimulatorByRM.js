import { LightningElement, api, track } from 'lwc';
import LightningConfirm from "lightning/confirm";
import getMonthlyActualTarget from '@salesforce/apex/MonthlyTargetSimulator.getMonthlyActualTarget';
import submitMonthlyTargetByRM from '@salesforce/apex/MonthlyTargetSimulator.submitMonthlyTargetByRM';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const columns = [
    { label: 'Product Name', fieldName: 'Product__c', styleClass: 'hideHeader', initialWidth: 200, 'objectName': 'Target_Simulator__c' },
    { label: 'Target(in Tons)', styleClass: 'showHeader', fieldName: 'Initial_Target__c', initialWidth: 140, 'isText': true, 'isLabel': false, 'objectName': 'Target_Simulator__c' },
    { label: 'Price', styleClass: 'showHeader', fieldName: 'Price__c', initialWidth: 100, 'objectName': 'Target_Simulator__c' },
    { label: 'Initial R05', rowsapn: 1, fieldName: 'Initial_R05__c', initialWidth: 140, 'isText': false, 'isLabel': true, 'objectName': 'Target_Simulator__c' },
    { label: 'Target(in Tons)', styleClass: 'showHeader', fieldName: 'Actual_Target__c', initialWidth: 140, 'objectName': 'Target_Simulator__c' },
    { label: 'Price', styleClass: 'showHeader', fieldName: 'Price__c', initialWidth: 100, 'objectName': 'Target_Simulator__c' },
    { label: 'R05', styleClass: 'showHeader', fieldName: 'Actual_R05__c', initialWidth: 140, 'objectName': 'Target_Simulator__c' }
];
export default class MontlyTargetSimulatorByRM extends LightningElement {
    columns = columns;
    @track selectedRegion;
    @track selectedSegment;
    @track selectedYear = new Date().getFullYear().toString();
    @track selectedMonth = (new Date().getMonth() + 1).toString();
    data = [];
    @track hasError = false;
    @api recordId;
    rowid;
    isLoading = false;
    searchvalue;
    @track iscallanotherLWC = false;
    @track size = 0;
    subscription = {};
    @track submitError;
    datatable = false;
    recordsToDisplay = [];
    @track filterOptions = [];
    processedRows = [];
    @track rows = [];
    @track csvcolumns = [];
    @track csvdata = [];
    @track error;


    get regionOptions() {
        return [{ label: "South", value: "South" }, { label: "North", value: "North" }, { label: "West", value: "West" }, { label: "East", value: "East" }];
    }
    get segmentOptions() {
        return [{ label: "Processor", value: "Processor" }, { label: "Distribution", value: "Distribution" }];
    }
    get yearOptions() {
        var today = new Date();
        var before10Years = new Date(today.getFullYear() - 10, 1 - 1, 1);
        console.log('before10Years.....' + before10Years);
        var options = [];
        for (let i = before10Years.getFullYear(); i <= today.getFullYear(); i++) {
            options.push({ label: i.toString(), value: i.toString() });
        }
        return options;
    }
    get monthOptions() {
        return [{ label: "Jan", value: "1" }, { label: "Feb", value: "2" }, { label: "Mar", value: "3" }, { label: "Apr", value: "4" }, { label: "May", value: "5" }, { label: "Jun", value: "6" }, { label: "Jul", value: "7" }, { label: "Aug", value: "8" }, { label: "Sept", value: "9" }, { label: "Oct", value: "10" }, { label: "Nov", value: "11" }, { label: "Dec", value: "12" }];
    }


    handleComboChange(event) {
        var target = event.target;
        var dataId = target.getAttribute("data-id");
        if (dataId === 'Year__c') {
            this.selectedYear = event.target.value;
        } else if (dataId === 'Month__c') {
            this.selectedMonth = event.target.value;
        } else if (dataId === 'Segment__c') {
            this.selectedSegment = event.target.value;
        } else if (dataId === 'Region__c') {
            this.selectedRegion = event.target.value;
        }
        console.log('dataId....' + dataId);
    }

    fetchActualTargetRows() {
        const All_Compobox_Valid = [...this.template.querySelectorAll('lightning-combobox')]
            .reduce((validSoFar, input_Field_Reference) => {
                input_Field_Reference.reportValidity();
                return validSoFar && input_Field_Reference.checkValidity();
            }, true);
        console.log('All_Compobox_Valid.....' + All_Compobox_Valid);
        if (All_Compobox_Valid) {
            this.template.querySelector('[data-id="layout-container"]').classList.remove('alignCenter');
            getMonthlyActualTarget({ Region_c: this.selectedRegion, Segment_c: this.selectedSegment, Year_c: this.selectedYear, Month_c: this.selectedMonth })
                .then(response => {
                    if (response.length > 0) {
                        console.log('response....' + response);
                        this.rows = response;
                        this.fetchRows();
                    }
                    else {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Information',
                                message: 'Target not yet updated for the month.',
                                variant: 'info'
                            }),
                        );
                    }
                }).catch(error => {
                    this.isLoading = false;
                    this.submitError = error.body.message;
                    this.hasError = true;
                    console.log('error......' + error.body.message);
                })
        }
        else {
            this.template.querySelector('[data-id="layout-container"]').classList.add('alignCenter');
        }
    }
    fetchRows() {
        var self = this;
        let tempArray = [];
        this.rows.forEach(function (value) {
            // do some work on data here
            let R05Value = (value.Actual_Target__c * value.Price__c * 400);
            value.Actual_R05__c = R05Value;
            value.Region__c = self.selectedRegion;
            value.Month__c = self.selectedMonth;
            value.Segment__c = self.selectedSegment;
            value.Year__c = self.selectedYear;
            tempArray.push(value);
            console.log('tempArray.....' + tempArray.Region__c);
        });
        this.processedRows = tempArray;
        if (this.processedRows.length > 0)
            this.datatable = true;


    }
    handleActualTargetChange(event) {
        var target = event.target;
        var rowIndex = target.getAttribute("data-row-index");
        this.rows[rowIndex].Actual_Target__c = target.value;

        this.rows[rowIndex].Actual_R05__c = (this.rows[rowIndex].Actual_Target__c * this.rows[rowIndex].Price__c * 400);

        this.processedRows = this.rows;
    }
    async submitMonthlyTarget() {
        this.isLoading = true;
        const result = await LightningConfirm.open({
            message: "Are you sure you want to submit this?",
            variant: "inverse",
            label: "Confirm Submit"
        });
        if (result) {

            submitMonthlyTargetByRM({ targetSimulatorRecords: this.processedRows })
                .then(response => {
                    console.log('Result......' + response);
                    this.isLoading = false;
                    this.hasError = false;
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'Target Simulator Submitted Successfully!!',
                            variant: 'success'
                        }),
                    );
                    this.fetchActualTargetRows();
                }).catch(error => {
                    this.isLoading = false;
                    this.submitError = error.body.message;
                    this.hasError = true;
                    console.log('error......' + error.body.message);
                })
        }
    }

}
