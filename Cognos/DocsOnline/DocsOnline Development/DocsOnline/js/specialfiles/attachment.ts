class attachments {

    
  getAttachDefinitions(progIDs: Array<string>): Observable<AttachmentDefinition[]> {
    let url = "documents/attachDefinitions?progIds=";
    // Pull out the progIDs and put them into the request
    for (let i = 0; i < progIDs.length; i++) {
      url += "BT20." + progIDs[i] + ",";
    }

    // Remove last comma
    url = url.replace(/,\s*$/, "");
    return this.doGetRequest(url).map((res) => {
      let data: AttachmentDefinition[] = res.json();
      return data;
    });
  }

  fetchAttachDefs(): Observable<AttachmentDefinition[]> {
    let progIdList = Array<string>();

    // Get all the entityTypes from the datasources
    for (let i = 0; i < this.datasources.length; i++) {
      progIdList.push(this.datasources[i].entityType);
    }

    return this.workflowService.getAttachDefinitions(progIdList).switchMap((attachDefs) => {
      return Observable.of(attachDefs);
    });
  }
}
