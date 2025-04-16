import "rxjs/add/observable/forkJoin";
import "rxjs/add/operator/publish";
import "rxjs/add/operator/catch";
import "rxjs/add/observable/empty";
import { AttachmentDefinition } from "@uiscreens/datamodel";
import { Injectable, Inject } from "@angular/core";
import { PSScreenInfo, HttpGetApi, HttpPostApi, PS_API_URLBASE, HttpGetData } from "@uiscreens/http";
import { Observable } from "rxjs/Observable";
import { Response, Http, RequestOptionsArgs, RequestMethod, ResponseContentType } from "@angular/http";

/**
 * The main purpose of this service is to retrieve workflow related data
 */
@Injectable()
export class PSWorkflowService {
    protected static hasWorkflowModels: boolean;
    legacyWorkflowApi_uri: string;
    public selectedModelTask;
    public currentUser;
    public currentHistoryRecord;
    public listOfRoleNames = {};
    public listOfUserNames = {};
    public userList;
    public userNameMap = {};
    private userRoles: string[];
    private getWfUsers: boolean = true;
    private getRoles: boolean = true;

    constructor(public getHttp: HttpGetApi,
                private postHttp: HttpPostApi,
                private http: Http,
                public getHttpData: HttpGetData,
                @Inject(PS_API_URLBASE) private apiurlbaseIn: string,
                @Inject(PSScreenInfo) screenInfo: PSScreenInfo) {
        this.legacyWorkflowApi_uri = "workflow";
    }
    // Populate Roles and Names in a cached list if we haven't performed the get previous to this.
    // Make sure that this now is called before using any of the listOfRoleNames or userNameMap
    public populateRolesAndWfUsers = () => {
        // Get Group Names
        if (this.getRoles) {
            this.getRoleNames();
            this.getRoles = false;
        }
        if (this.getWfUsers) {
            this.getWorkFlowUsers();
            this.getWfUsers = false;
        }
    }

    doGetRequest(url: string): Observable<Response> {
        return this.getHttp.get(url);
    }

    doPostRequest(url: string, data: string) {
        return this.postHttp.post(url, data);
    }

    getRoleNames() {
        // Use cached record service to get role table
        let path = "USRoleMaster?$top=10000";
        this.getHttpData.get(path).subscribe((res) => {
            let record = res.json();
            if (record.items.length > 0) {
                for (let i = 0; i < record.items.length; i++) {
                    let roleId = record.items[i].RoleId;
                    let roleName = record.items[i].RoleTitle;
                    this.listOfRoleNames[roleId] = roleName;
                }
            }
        });
    }

    getAttachDefinitions(progIDs: Array<string>): Observable<AttachmentDefinition[]> {
        let url = "documents/attachDefinitions?progIds=";
        // Pull out the progIDs and put them into the request
        for (let i = 0; i < progIDs.length; i++) {
            url += "BT20." + progIDs[i] + ",";
        }

        // Remove last comma
        url = url.replace(/,\s*$/, "");
        return this.doGetRequest(url).map(res => {
            let data: AttachmentDefinition[] = res.json();
            return data;
        });
    }

    getPendingAttachments(mask) {
        let url = "documents/PendingAttachments/" + mask;
        return this.doGetRequest(url);
    }

    getAttachments(recordData, entityType) {
        let url = "documents/" + entityType + "/attachments/";
        let data = JSON.stringify(recordData);
        return this.doPostRequest(url, data);
    }

    postAttachment(requestObj) {
        let url = this.apiurlbaseIn + "documents/attachDoc";
        let options: RequestOptionsArgs = {
            url: url,
            method: RequestMethod.Post,
            body: JSON.stringify(requestObj),
            responseType: ResponseContentType.Text
        };
        return this.http.request(url, options);
    }

    postTaskUpdate(requestObj) {
        let url = "workflow/taskupdate";
        let data = JSON.stringify(requestObj);
        return this.doPostRequest(url, data);
    }

    deleteAttachment(requestObj) {
        let url = "documents/DeleteDocument";
        let data = JSON.stringify(requestObj);
        return this.doPostRequest(url, data);
    }

    getUserState() {
        let url = this.legacyWorkflowApi_uri + "/Users?";
        url += "UserIds=" + encodeURI("\\user");
        return this.doGetRequest(url);
    }

    getUsers() {
        let url = this.legacyWorkflowApi_uri + "/Users?WfAccessFlags=ADY";
        return this.doGetRequest(url);
    }

    getUserRoles(dataSource: string) {
        if (this.userRoles) {
            return Observable.of(this.userRoles);
        }
        let url = this.legacyWorkflowApi_uri + "/UserRoles?";
        url += "&UserIds=" + encodeURI("\\user");
        url += "&propertyName=" + dataSource;
        return this.doGetRequest(url).map(
            data => this.recvUserRoles(data));
    }

    recvUserRoles(data): string[] {
        if (data) {
            let curRoles: string[] = JSON.parse(data._body);
            this.userRoles = curRoles;
            return curRoles;
        } else {
            return [];
        }
    }

    getWorkFlowUsers() {
        return this.getUsers().subscribe(
            data => this.recvWFUserNames(data),
            err => console.error("Error receiving list of Work Flow Users: " + err));
    }

    recvWFUserNames(data) {
        let response = JSON.parse(data._body)["Response"];
        let users = response["Users"];
        this.userList = users["User"];

        if (this.userList === undefined || this.userList == null) {
            return;
        }
        // Get userIDs and Names into list for forward delegatee dropdown
        this.userList = this.arrayUnique(this.userList);
        // Sort users by UsId
        this.userList.sort((a, b) => {
            if (a["@Name"] < b["@Name"]) {
                return -1;
            }
            if (a["@Name"] > b["@Name"]) {
                return 1;
            }
            return 0;
        });

        // Get userIDs and Names for ID -> FullName lookup
        for (let i = 0; i < this.userList.length; i++) {
            let userId = this.userList[i]["@UsId"];
            let userName = this.userList[i]["@Name"];
            this.userNameMap[userId] = userName;
        }
    }

    arrayUnique(listArray) {
        let cleaned = [];
        for (let i = 0; i < listArray.length; i++) {
            let unique = true;
            let itm = listArray[i];
            for (let j = 0; j < cleaned.length; j++) {
                let itm2 = cleaned[j];
                if (itm["@UsId"] === itm2["@UsId"] && itm["@No"] === itm2["@No"]) {
                    unique = false;
                }
            }

            if (unique) {
                cleaned.push(itm);
            }
        }
        return cleaned;
    }

    getTaskForWFKey(wfKey: string) {
        let url = this.legacyWorkflowApi_uri + "/Tasks?";
        url += "&WfKey=" + encodeURIComponent(wfKey);
        url += "&InstanceJoin=" + encodeURIComponent("Y");

        return this.doGetRequest(url);
    }

    getBT20WorkflowModels(progIDs: Array<string>) {
        // If we already know that this screen has a workflow model setup
        if (PSWorkflowService.hasWorkflowModels) {
            return Observable.of(PSWorkflowService.hasWorkflowModels);
        }

        let dataObjects = [];
        progIDs.forEach((id) => {
            let progID = "BT20." + id;
            dataObjects.push({ "progID": progID });
        });

        let body = { "dataObjects": dataObjects };
        return this.postHttp.post("workflow/GetBT20Models", body)
            .map((res) => {
                let response = res.json();
                let r = response["Response"];
                if (r) {
                    let workflowModels = r["workflow_models"];
                    if (workflowModels) {
                        let modelInfo = workflowModels["model_info"];
                        PSWorkflowService.hasWorkflowModels = (modelInfo !== undefined && modelInfo !== null);
                    }
                }
                return PSWorkflowService.hasWorkflowModels;

            });
    }

    updateTask(recordObj): Observable<Response> {
        let url = "workflow/taskupdate";
        let data = JSON.stringify(recordObj);
        return this.doPostRequest(url, data);
    }
}
