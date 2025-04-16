import { Component, Input, Output, EventEmitter, Pipe, PipeTransform, Inject, ReflectiveInjector, Injector, OnInit, OnChanges, OnDestroy, SimpleChanges, ElementRef, Renderer2 } from "@angular/core";
import { ScreenState, PSWorkflowService, PSTranslateStringService } from "@uiscreens/services";
import { PSScreenInfo } from "@uiscreens/http";
import { Modal, overlayConfigFactory } from "angular2-modal";
import { PSDataSource, AttachmentDefinition, AttachmentColumInfo, DSCurrentRecordChangedEvent } from "@uiscreens/datamodel";
import { PSSecurityService } from "@uiscreens/services";
import { BSModalContext } from "angular2-modal/plugins/bootstrap";
import { PSAddNewAttachmentModal, PSDeleteRecordModal } from "@uiscreens/modals";
import { Observable, Subscription, Subject, BehaviorSubject } from "rxjs/Rx";
import { PSMessageService, PSBusyService, RuleResultError, DSAddModeAction, DSMode, PS_DATASOURCES, RuleResult, DSCurrentRecordChanged } from "@uiscreens/common";

export type pendingActionState = "New" | "Current" | "Delete";

export interface DeleteDocumentObject {
    Description: string;
    AttachObject: string;

    AttachData: {
        AttachDef: string;
        AttachTable: string;
        AttachColumn: string;
        AttachColumnValue: string;
        InstanceKey: string;
        DocId: string;
        DocToken: string;
    };

    FileExtension: string;
    DocToken: string;
}

@Pipe({ name: "CurrentDocumentFilter" })
export class CurrentDocumentFilterPipe implements PipeTransform {
    transform(docs, term) {
        if (!term) {
            return docs;
        }
        term = term.toLowerCase();
        return docs.filter(doc =>
            doc.clsid.toLowerCase().indexOf(term) !== -1 ||
            doc.description.toLowerCase().indexOf(term) !== -1 ||
            doc.docId.toLowerCase().indexOf(term) !== -1
        );
    }
}

@Pipe({ name: "PendingDocumentFilter" })
export class PendingDocumentFilterPipe implements PipeTransform {
    transform(docs, term) {
        if (!term) {
            return docs;
        }
        term = term.toLowerCase();
        return docs.filter(doc =>
            doc.clsid.toLowerCase().indexOf(term) !== -1 ||
            doc.description.toLowerCase().indexOf(term) !== -1 ||
            doc.docId.toLowerCase().indexOf(term) !== -1
        );
    }
}

interface AttachmentDSData {
    attachDefs: AttachmentDefinition[];
    attachments: any[];
    refreshObservable: Subject<RefreshData>;
    entityType: string;
}

interface AttachmentFetchResult {
    entityType: string;
    attachmentFetched: boolean;
}

interface RefreshData {
    attachDSData: AttachmentDSData;
    dataSource: PSDataSource;
}

@Component({
    selector: "psAttachments",
    host: { class: "ps-attachments" },
    styles: [`
        .modal-backdrop { position: absolute; }
        .centered-spinner { position: absolute; }
    `],
    template: `
    <div *ngIf="isLoading" class="in modal-backdrop">
        <div class="loading centered-spinner">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>
    <div class="attachments">
        <div class="expandable-panel__header">Attachments</div>
        <ul *ngIf="attachments.length > 0" class="list-unstyled"
            [class.no-pending]="!pendingPresent">
            <div class="attachments-attached">
                <li *ngFor="let doc of (attachments | CurrentDocumentFilter: searchTerm)">
                        <a title="{{doc.description}}({{doc.docId}})" style="width:45%" class="pull-left" href="{{getViewerUrl(doc.docToken, doc.url)}}" target="{{doc.docId}}">
                            <span title="{{doc.docId}}" class="{{extensionClass(doc.clsid)}} pull-left attachments-icon"></span>
                            <span>{{doc.description}}</span>
                        </a>
                        <div *ngIf="hasFunctionalAccess" class="pull-right" style="width:45%">
                            <button class="btn btn-danger" style="padding:5px!important; margin-top:5px!important;" (click)="deleteAction(doc)">
                                <span>Delete</span>
                            </button>
                        </div>

                </li>
            </div>
        </ul>
        <label *ngIf="pendingPresent">Pending</label>
        <ul *ngIf="pendingPresent" class="list-unstyled"
            [class.no-attachments]="!attachments.length === 0">
            <div class="attachments-pending">
                <li *ngFor="let pendingDoc of (pendingAttachments | PendingDocumentFilter: searchTerm); let i = index">
                    <a title="{{pendingDoc.description}}({{pendingDoc.DocId}})" href="{{getViewerUrl(pendingDoc.DocToken, pendingDoc.Url)}}" target="{{pendingDoc.DocId}}">
                        <span class="{{extensionClass(pendingDoc.Clsid)}} pull-left attachments-icon"></span>
                        <span>{{pendingDoc.Description}}</span>
                    </a>

                    <div class="btn-group" style="position: relative;bottom: 6px;">
                        <button type="button" class="btn" style="width: 53px;padding-left: 5px;"
                            [class.btn-danger]="pendingDoc.pendingAction ==='Delete'"
                            [class.btn-primary]="pendingDoc.pendingAction !=='Delete'"
                            (click)="executeAction(pendingDoc)">
                            {{pendingDoc.pendingAction}}
                        </button>
                        <button type="button" class="btn dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"
                            [class.btn-danger]="pendingDoc.pendingAction ==='Delete'"
                            [class.btn-primary]="pendingDoc.pendingAction !=='Delete'"
                            [attr.id]="'pa-' + i"
                            (click)="handleDropdownLocation('#pa-' + i)">
                            <span class="caret"></span>
                            <span class="sr-only">Toggle Dropdown</span>
                        </button>
                        <ul class="dropdown-menu floating-menu">
                            <li><a (click)="setPendingActionState(pendingDoc, 'Current')">Attach to Current</a></li>
                            <li><a (click)="setPendingActionState(pendingDoc, 'New')">Attach to New</a></li>
                            <li role="separator" class="divider"></li>
                            <li><a (click)="setPendingActionState(pendingDoc, 'Delete')">Delete</a></li>
                        </ul>
                    </div>
                </li>
            </div>
        </ul>

        <button class="btn btn-primary btn-block btn-extended-menu" (click)="addNewAttachment()">
            Add New Attachment
        </button>

        <div class="input-group live-filter-input">
            <input type="text" class="ps-input form-control" placeholder="Search (ex: pdf)" [(ngModel)]="searchTerm">
            <span class="input-group-addon live-filter-input__icon">
                 <span class="fa fa-search"></span>
            </span>
        </div>

    </div>
    `
})
export class PSAttachments implements OnInit, OnChanges, OnDestroy {
    @Output() hasAttachmentDef = new EventEmitter<boolean>();
    @Input() isShown: boolean = false;
    protected isLoading: boolean = false;
    protected pendingPresent: boolean = false;
    private hasFunctionalAccess;
    private attachments = [];
    private pendingAttachments = [];
    private attachDataArray: AttachmentDSData[] = [];
    private recordChangedSubscriptions = new Subscription();
    private userName: string;
    private resizeUnsubscribe: Function;
    private buttons = [];
    private toplevelDataSource: PSDataSource;
    private attachmentFetchingEvent = new BehaviorSubject<AttachmentFetchResult[]>([]);

    documentIconMap = {
        ".doc": "fa fa-file-word-o",
        ".docx": "fa fa-file-word-o",
        ".pdf": "fa fa-file-pdf-o",
        ".jpg": "fa fa-file-picture-o",
        ".jpeg": "fa fa-file-picture-o",
        ".tiff": "fa fa-file-picture-o",
        ".png": "fa fa-file-picture-o",
        ".txt": "fa fa-file-text-o",
        ".data": "fa fa-file-text-o",
        ".text": "fa fa-file-text-o",
        ".bmp": "fa fa-file-picture-o"
    };

    private _workflowService: PSWorkflowService;
    private get workflowService() {
        if (!this._workflowService) {
            this._workflowService = this.injector.get(PSWorkflowService);
        }
        return this._workflowService;
    }

    constructor(screenState: ScreenState,
                private translateString: PSTranslateStringService,
                private modal: Modal,
                private elementRef: ElementRef,
                private renderer: Renderer2,
                private securityService: PSSecurityService,
                private busyService: PSBusyService,
                private messageService: PSMessageService,
                private injector: Injector,
                @Inject(PSScreenInfo) private screenInfo: PSScreenInfo,
                @Inject(PS_DATASOURCES) private datasources: PSDataSource[]) {

        this.translateString.$translateString("//USER")
            .subscribe((userName) => this.userName = userName);

        this.toplevelDataSource = this.datasources.find((datasource) => {
            return datasource.parentNavigationProperty === undefined;
        });

        this.toplevelDataSource.$currentRecordChanged.subscribe((ev: DSCurrentRecordChanged) => {
            // Clear out last fetched attachment list upon main data selection
            this.attachments = [];
        });

        // Monitor for attachment list fetching events to act on fetching stages
        // accordingly.
        this.attachmentFetchingEvent.subscribe((fetchResults: AttachmentFetchResult[]) => {
            if (fetchResults.length > 0) {
                const fetchedData = fetchResults.filter(item => item.attachmentFetched === true);

                // Only act on it when all fetching events are completed
                if (fetchedData.length === fetchResults.length) {
                    // Unbusy the panel
                    this.isLoading = false;
                    this.attachmentFetchingEvent.next([]);
                }
                else {
                    // Not all events are completed yet => busy out the panel
                    this.isLoading = true;
                }
            }
        });

        this.loadAttachDefinitions();
        this.securityService.loadFunctionalSecurity();
        this.hasFunctionalAccess = this.securityService.hasFunctionalAccess("DELETEATTACH");
    }

    /**
     * sets pendingAction variable to "Current" | "New" | "Delete"
     * @param  {pendingActionState} state "Current" | "New" | "Delete"
     */
    protected setPendingActionState(doc, state: pendingActionState) {
        doc.pendingAction = state;
    }

    /**
     * If directUrl is the Shasta Document Viewer or not specified, construct a URL by docToken.
     * Else, use the directUrl itself (e.g. Laserfiche document launch)
     * @param docToken: secured version of doc info for launching document.
     * @param directUrl: direct URL created by the server. Should only use this if it is an URL
     *  to external doc storage (e.g. Laserfiche)
     */
    protected getViewerUrl(docToken: string, directUrl: string): string {
        let url = `${this.screenInfo.basePath}/ui/Documents/viewer?docToken=${docToken}`;

        if (directUrl &&
            directUrl.toLowerCase().indexOf("documents/viewer.aspx?") < 0 &&
            directUrl.toLowerCase().indexOf("documents/viewer?") < 0) {
            url = directUrl;
        }

        return url;
    }

    protected deleteAction(doc) {
        doc.pendingAction = "Delete";
        let jsonObject: DeleteDocumentObject = {
            "Description": doc.description,
            "AttachObject": "78E6477D-CB2B-4B89-BFD4-ECF800F2B46F",
            "AttachData": {
                "AttachDef": "",
                "AttachTable": "",
                "AttachColumn": "",
                "AttachColumnValue": "",
                "InstanceKey": doc.UniqueKey,
                "DocId": "" + doc.docId,
                "DocToken": "" + doc.docToken
            },
            "FileExtension": doc.Clsid,
            "DocToken": doc.docToken
        };

        let modalContext = new BSModalContext();
        modalContext.size = "sm";
        let resolvedBindings = ReflectiveInjector.resolve([
            { provide: "staticText1", useValue: "Are you sure you want to delete the following document(s)?\n" },
            { provide: "dataIdentifier", useValue: doc.description },
            { provide: "staticText2", useValue: "" }
        ]);
        this.modal.open(PSDeleteRecordModal, overlayConfigFactory(modalContext, BSModalContext, { bindings: resolvedBindings }))
            .then((d) => d.result)
            .then((r) => {
                if (r === "Y") {
                    this.workflowService.deleteAttachment(jsonObject).subscribe(
                        data => {
                            // If we get here we are gold, Pending doc has been attached
                            this.messageService.addSuccess("Deleting Document: " + doc.description + " " + doc.docId + " Successfully");

                            // Now we need to update the instance and history record
                            this.updateInstanceData(doc);

                            let index = this.attachments.findIndex(d => d.docId === doc.docId);
                            if (index !== -1) {
                                this.attachments.splice(index, 1);
                            }
                        },
                        err => console.error("Error deleting document: " + err)
                    );
                }
            });
    }
    /**
     * uses the pendingAction to determine what method to call
     * @param doc document from the array pendingAttachments
     */
    protected executeAction(doc) {
        switch (doc.pendingAction) {
            case "New":
                this.attachToNewRecord(doc);
                let url = this.getViewerUrl(doc.DocToken, doc.Url);
                window.open(url, "Popup", "location=1,status=1,scrollbars=1, resizable=1, directories=1, toolbar=1, titlebar=1, width=800, height=800");
                break;
            case "Current":
                this.attachPending(doc);
                break;
            case "Delete":
                this.deleteDocument(doc);
                break;
            default:
                console.error("Could not determine what action to use :: Check the variable pendingAction in ps-attachments.component");
        }
    }

    ngOnInit() {
        let owningElement = this.elementRef.nativeElement;

        // if jquery events are found check to see if any of these menus are open
        jQuery(owningElement).on("shown.bs.dropdown hidden.bs.dropdown", () => {
            this.checkOpen();
        });
    }

    /**
     * check to see if 'open' class exists on any of the button groups in the component
     * and if so start listening for scrolling or resize
     */
    private checkOpen() {
        this.buttons = this.elementRef.nativeElement.querySelectorAll(".btn-group");
        let isOpen = false;
        // Check if any dropdowns are open
        let length = this.buttons.length;
        for (let i = 0; i < length; i++) {
            if (this.buttons[i].classList.contains("open")) {
                isOpen = true;
            }
        }
        if (isOpen) {
            this.startListening();
        } else {
            this.stopListening();
        }
    }

    /**
     * start a gobal listener for scrolling or window resize that
     * closes the dropdown on event
     */
    private startListening() {
        this.resizeUnsubscribe = this.renderer.listen("window", "resize", () => {
            this.closeDropdown();
            this.stopListening();
        });
        window.addEventListener("scroll", () => {
            this.closeDropdown();
            this.stopListening();
        }, true);
    }

    /**
     * stop the gobal listener for scrolling or window resize
     */
    private stopListening() {
        if (this.resizeUnsubscribe) {
            this.resizeUnsubscribe();
        }
        window.removeEventListener("scroll", () => {
            this.closeDropdown();
            this.stopListening();
        }, true);
    }

    /**
     * closes all of the dropdowns associated with this component
     */
    private closeDropdown() {
        this.buttons.forEach((each) => {
            jQuery(each).removeClass("open");
        });
    }

    /**
     * Determines where to position the dropdown menu
     * @param  {string} selector the css selector for the button associated (preferably an id tag)
     */
    protected handleDropdownLocation(selector: string) {
        let openbutton = this.elementRef.nativeElement.querySelector(selector);
        if (openbutton) {
            let buttonTop = openbutton.getBoundingClientRect().top;
            let buttonLeft = openbutton.getBoundingClientRect().left;
            let styleString = "left: " + (buttonLeft - 134) + "px; top: " + (buttonTop + 28) + "px;";
            openbutton.parentElement.querySelector("ul.floating-menu").setAttribute("style", styleString);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        let isShownChanges = changes["isShown"];
        if (isShownChanges) {
            if (isShownChanges.currentValue === true) {
                // Clear out last fetched attachment list upon panel shown
                this.attachments = [];

                this.fetchPendingAttachments();

                // Must create a new subscription because the other one is most likely dead from being unsubscribed from.
                this.recordChangedSubscriptions = new Subscription();

                this.attachDataArray.forEach(data => {
                    let ds = this.datasources.find(ds => ds.entityType === data.entityType);
                    if (ds) {
                        this.recordChangedSubscriptions.add(ds.$currentRecordChanged.subscribe(
                            state => {
                                // Clear out record's last fetched attachment list upon record selection
                                data.attachments = [];
                                data.refreshObservable.next({ attachDSData: data, dataSource: ds });
                            }));
                    }
                });
            }
            else {
                this.recordChangedSubscriptions.unsubscribe();
            }
        }
    }

    private showPending() {
        // Check if there are any pending attachments to show
        if (this.pendingAttachments.length <= 0) {
            this.pendingPresent = false;
        }
        else {
            this.pendingPresent = true;
        }
    }

    private fetchPendingAttachments() {
        // Clear pending attachments
        this.pendingAttachments = [];

        this.workflowService.getPendingAttachments(this.screenInfo.mask).subscribe(
            data => {
                // Remove @ signs
                let returnData: string = (<any>data)._body;
                returnData = returnData.split("@").join("");

                // Get the body of attachments
                let body = JSON.parse(returnData);
                if (body != null) {
                    let response = body.Response;
                    let initialAction: pendingActionState = "New";
                    if (response != null) {
                        // Get Pending Attachments Object
                        let attachments = response.PendingAttachments;

                        // Check if 1 or many pending attachments
                        if (attachments === null) {
                            return;
                        }

                        // Zero and we leave
                        if (attachments.Count === "0") {
                            this.showPending();
                            return;
                        }

                        if (attachments.Count === "1") {
                            let attachment = attachments.PendingAttachment;

                            // Add open bool for menu
                            attachment["open"] = false;
                            attachment["pendingAction"] = initialAction;
                            this.pendingAttachments.push(attachment);
                        }
                        else {
                            // Add open bool for menu
                            this.pendingAttachments = attachments.PendingAttachment;
                            for (let i = 0; i < this.pendingAttachments.length; i++) {
                                this.pendingAttachments[i]["open"] = false;
                                this.pendingAttachments[i]["pendingAction"] = initialAction;
                            }

                            // Use the default backend-provided sort order of DocId descending numerically.
                        }
                    }
                }
                this.showPending();
            },
            err => console.error("Error receiving list of pending attachments -or- no pending attachments found: " + err)
        );
    }

    private rebuildAttachmentsList() {
        this.attachments = [];
        this.attachDataArray.forEach(data => {
            this.attachments = this.attachments.concat(data.attachments);
        });

        // Use the default backend-provided sort order of DocId descending numerically.
    }

    private fetchCurrentAttachmentsRequest(recordData, entityType): Observable<any> {
        return this.workflowService.getAttachments(recordData, entityType)
            .switchMap(response => Observable.of(response))
            .catch(err => {
                // Ensure all error returned (e.g. failed in OnBase list retrieval)
                // from the API call are handled with returning empty list so subscriber
                // (e.g. SwitchMap)  does not get destroyed.
                let errorResult = err.json();
                if (Array.isArray(errorResult)) {
                    errorResult.forEach((rule: RuleResult) => {
                        console.error(`Attachment fetch rule ${rule.result} - ${rule.ruleMessage}`);
                    });

                    this.messageService.addError(`Failed to fetch current attachments for ${entityType}`, "Current Attachments", true);
                }
                else {
                    this.messageService.addError(`Failed to fetch current attachments for ${entityType}: ${errorResult}`, "Current Attachments", true);
                }

                console.error(`Failed to fetch current attachments for ${entityType} : ${err}`);

                let failedResult = {
                    failedEntityType: entityType
                };

                return Observable.of(failedResult);
            });
    }

    protected extensionClass(extension: string) {
        let iconClass = this.documentIconMap[extension.toLowerCase()];
        if (iconClass === undefined) {
            return "fa fa-file-o";
        }
        return iconClass;
    }

    protected attachToNewRecord(doc) {
        let attachDef = this.findAttachDef(doc.AttachId);
        if (attachDef) {
            let ds = this.datasources.find(dataSource => dataSource.entityType === attachDef.entityType);
            let action = ds.resolveAction(DSAddModeAction);
            action.oncomplete(() => {
                let currentRecord = ds.currentRecord;
                ds.$afterSaveComplete.take(1).subscribe((data) => {
                    // Ensure the record is the same. This is to prevent cancellations (user goes back into grid mode without saving)
                    if (currentRecord === ds.currentRecord) {
                        this.attachPending(doc);
                    }
                });
            });

            action.execute();
        } else {
            console.error("Failed to locate attachment definition associated with pending attachment");
        }
    }

    protected deleteDocument(doc) {
        let jsonObject: DeleteDocumentObject = {
            "Description": doc.Description,
            "AttachObject": "78E6477D-CB2B-4B89-BFD4-ECF800F2B46F",
            "AttachData": {
                "AttachDef": "",
                "AttachTable": "",
                "AttachColumn": "",
                "AttachColumnValue": "",
                "InstanceKey": doc.UniqueKey,
                "DocId": "" + doc.docId,
                "DocToken": "" + doc.docToken
            },
            "FileExtension": doc.Clsid,
            "DocToken": doc.DocToken
        };

        this.workflowService.deleteAttachment(jsonObject).subscribe(
            data => {
                // If we get here we are gold, Pending doc has been attached
                this.messageService.addSuccess("Deleting Document: " + doc.Description + " " + doc.DocId + " Successfully");

                // Now we need to update the instance and history record
                this.updateInstanceData(doc);

                let index = this.pendingAttachments.findIndex(d => d.DocId === doc.DocId);
                if (index !== -1) {
                    this.pendingAttachments.splice(index, 1);
                }
            },
            err => console.error("Error deleting pending document: " + err)
        );
    }

    protected addNewAttachment() {
        let modalContext = new BSModalContext();
        modalContext.size = "lg";

        let attachDefs: AttachmentDefinition[] = [];
        this.attachDataArray.forEach(data => {
            data.attachDefs.forEach(attachdef => {
                if (attachDefs.find(x => x.id === attachdef.id) === undefined) {
                    attachDefs = attachDefs.concat(attachdef);
                }
            });
        });

        let resolvedBindings = ReflectiveInjector.resolve(
            [
                { provide: PS_DATASOURCES, useValue: this.datasources },
                { provide: "AttachDefs", useValue: attachDefs },
                { provide: "customData", useValue: undefined }
            ]
        );
        this.modal.open(PSAddNewAttachmentModal, overlayConfigFactory(modalContext, BSModalContext, { bindings: resolvedBindings }))
            .then((d) => d.result)
            .then((r) => {
                this.attachDataArray.forEach(data => {
                    let ds = this.datasources.find(ds => ds.entityType === data.entityType);
                    if (ds) {
                        data.refreshObservable.next({ attachDSData: data, dataSource: ds });
                    }
                });
            });
    }

    private findAttachDef(attachId: string) {
        for (let attachData of this.attachDataArray) {
            let attachDef = attachData.attachDefs.find(def => def.id === attachId);
            if (attachDef) {
                return attachDef;
            }
        }
    }

    // tslint:disable-next-line
    private attachPending(doc) {
        // Get attachdefinition specified document
        let attachDef = this.findAttachDef(doc.AttachId);
        if (!attachDef) {
            // Error, could not find attach definition that matches the document definition
            return;
        }

        let ds = null;
        // Get the property value from the current record
        let columns: AttachmentColumInfo[] = attachDef.columns;
        let attachObject: String = attachDef.attachmentObject;
        for (let i = 0; i < columns.length; i++) {
            ds = this.datasources.find(dataSource => dataSource.entityType === attachDef.entityType);
            if (ds) {
                columns[i].columnValue = ds.currentRecord[columns[i].columnProperty];
            }
        }
        let jsonObject = {
            "Description": doc.Description,
            "AttachObject": attachObject,
            "AttachData": {
                "AttachDef": attachDef.id,
                "AttachTable": attachDef.table,
                "AttachColumn": columns,
                "InstanceKey": doc.UniqueKey
            },
            "FileExtension": doc.Clsid,
            "DocId": doc.DocId
        };

        this.workflowService.postAttachment(jsonObject).subscribe(
            data => {
                // If we get here we are gold, Pending doc has been attached
                this.messageService.addSuccess("Pending Document Attached Successfully");

                // Now we need to update the instance and history record
                this.updateInstanceData(doc);

                let index = this.pendingAttachments.findIndex(d => d.DocId === doc.DocId);
                if (index !== -1) {
                    this.pendingAttachments.splice(index, 1);
                }
                let attachData = this.attachDataArray.find(data => data.entityType === ds.entityType);
                attachData.refreshObservable.next({ dataSource: ds, attachDSData: attachData });
            },
            err => console.error("Error receiving list of current attachments -or- no current attachments found: " + err)
        );
    }

    private updateInstanceData(doc) {
        let jsonObject = {
            "action": "Y",
            "history_unique_key": doc.HistoryUniqueKey,
            "instance_unique_key": doc.InstanceUniqueKey,
            "user": this.userName
        };
        this.workflowService.postTaskUpdate(jsonObject).subscribe(
            data => {
                // If we get here we are gold, Pending doc has been attached
                this.messageService.addSuccess("Instance Updated Successfully");
            },
            err => console.error("Error receiving list of current attachments -or- no current attachments found: " + err)
        );
    }

    private loadAttachDefinitions() {
        this.fetchAttachDefs()
            .subscribe(
                data => {
                    if (!data) {
                        return;
                    }
                    let attachDefList: AttachmentDefinition[] = data;

                    if (attachDefList) {
                        for (let i = 0; i < attachDefList.length; i++) {
                            let attachDef: AttachmentDefinition = attachDefList[i];

                            let ds = this.datasources.find(ds => ds.entityType === attachDef.entityType);
                            if (!ds) {
                                continue; // Invalid attach def
                            }

                            // Go through properties and the property name from the column name.
                            for (let j = 0; j < attachDef.columns.length; j++) {
                                let col: AttachmentColumInfo = attachDef.columns[j];
                                for (let key in ds.properties) {
                                    let propCol = ds.properties[key].dbColumn;
                                    if (propCol && propCol.toUpperCase() === col.column) {
                                        col.columnProperty = key;
                                    }
                                }
                            }

                            // Add it to the existing attachment datasource data.
                            let existingAttachData = this.attachDataArray.find(a => a.entityType === attachDef.entityType);
                            if (existingAttachData) {
                                existingAttachData.attachDefs.push(attachDef);
                            } else {
                                // Create a new attachment datasource data. There will only be one per datasource.
                                let subject = new Subject<RefreshData>();
                                subject
                                    .switchMap(refreshData => {
                                        if (refreshData.dataSource.currentMode !== DSMode.Edit) {
                                            refreshData.attachDSData.attachments = [];
                                            this.rebuildAttachmentsList();
                                            return Observable.empty<any>();
                                        }

                                        let recordData = refreshData.dataSource.currentRecord.getData();
                                        let entityType = refreshData.dataSource.entityType;

                                        // Pre-setup and add new fetch event result by entity type
                                        const fetchResults = this.attachmentFetchingEvent.value;
                                        const updatedFetchResults = [...fetchResults, { entityType: entityType, attachmentFetched: false }];
                                        this.attachmentFetchingEvent.next(updatedFetchResults);

                                        let attachmentFetch = this.fetchCurrentAttachmentsRequest(recordData, entityType)
                                            .map(
                                                result => {
                                                    let processedEntityType = entityType;

                                                    try {
                                                        if (result.failedEntityType) {
                                                            // Process failed result
                                                            processedEntityType = result.failedEntityType;
                                                        }
                                                        else {
                                                            // Process successful result
                                                            let attachmentsArray = result.json();
                                                            refreshData.attachDSData.attachments = attachmentsArray || [];
                                                        }

                                                        this.rebuildAttachmentsList();
                                                    }
                                                    catch (err) {
                                                        console.error(`Failed to process attachment fetch result for entity type ${processedEntityType} - ${err}`);
                                                    }
                                                    finally {
                                                        const fetchResults = this.attachmentFetchingEvent.value;

                                                        fetchResults.forEach(item => {
                                                            // Update ALL fetch event results per the completion of a given entity type fetch
                                                            // e.g. There might be previous events of the same type initiated by previous record
                                                            // selection
                                                            if (item.entityType === processedEntityType) {
                                                                item.attachmentFetched = true;
                                                            }
                                                        });

                                                        // Push for check and processing (e.g. busy/unbusy the panel)
                                                        this.attachmentFetchingEvent.next(fetchResults);
                                                    }
                                                }
                                            );

                                        return attachmentFetch;
                                    })
                                    .subscribe(
                                        () => { },
                                        err => {
                                            console.error("Error receiving list of current attachments -or- no current attachments found: " + err);
                                        }
                                    );

                                this.attachDataArray.push({
                                    attachDefs: [attachDef],
                                    attachments: [],
                                    refreshObservable: subject,
                                    entityType: attachDef.entityType
                                });
                            }
                        }

                        this.hasAttachmentDef.emit(attachDefList.length > 0);
                    }
                },
                err => console.error("Error receiving list of attachments: " + err)
            );
    }

    private fetchAttachDefs(): Observable<AttachmentDefinition[]> {
        let progIdList = Array<string>();

        // Get all the entityTypes from the datasources
        for (let i = 0; i < this.datasources.length; i++) {
            progIdList.push(this.datasources[i].entityType);
        }

        return this.workflowService.getAttachDefinitions(progIdList)
            .switchMap(attachDefs => {
                return Observable.of(attachDefs);
            });
    }

    ngOnDestroy() {
        this.attachmentFetchingEvent.unsubscribe();
        this.recordChangedSubscriptions.unsubscribe();
        this.stopListening();
        // Unsubscribe from jquery events.
        jQuery(this.elementRef.nativeElement).off();
    }
}
