class AdvancedControl {
  static TOP_LEVEL_DATASOURCES = [];
  PS_DATA_URLBASE = new OpaqueToken("PS_DATA_URLBASE");
  PS_API_URLBASE = new OpaqueToken("PS_API_URLBASE");
  PS_GATEWAY_URLBASE = new OpaqueToken("PS_GATEWAY_URLBASE");

  PS_HTTPCLIENT_PROVIDERS = [
    { provide: PS_DATA_URLBASE, useValue: screenData.basePath + "/data/finance/legacy/" },
    { provide: PS_API_URLBASE, useValue: screenData.basePath + "/api/finance/legacy/" },
    { provide: PS_GATEWAY_URLBASE, useValue: screenData.basePath + "/gateway/" },
  ];

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
  initBaseUrl() {
    this.baseUrl = this.PS_DATA_URLBASE + this.entityType;
  }
  getParent(): PSDataSource {
    if (!this.internalParent && this.parentNavigationProperty) {
      this.internalParent = this.injector.get(this.parentNavigationProperty);
    }
    return this.internalParent;
  }

  getLinkProperty(parentProperty: string) {
    for (let index = 0; index < this.linkages.length; index++) {
      if (this.linkages[index].parentProperty === parentProperty) {
        return this.linkages[index].childProperty;
      }
    }
    throw new Error("Expected to find parent propety " + parentProperty);
  }

  hasChildren() {
    return this.children && this.children.length > 0;
  }

  getTableName() {
    return this.table;
  }
  getEntityType() {
    return this.entityType;
  }
  getUrl() {
    let url = this.baseUrl;
    let queryStringParams = {};
    let filter = this.getFilter();
    let orderBy = this.getOrderByClause();
    if (this.namedFilter) {
      queryStringParams["$namedfilters"] = this.namedFilter;
    }
    if (filter) {
      queryStringParams["$filter"] = filter;
    }
    if (orderBy) {
      queryStringParams["$orderby"] = orderBy;
    }
    let queryString = "";
    Object.keys(queryStringParams).forEach((param) => {
      if (queryString.length > 0) {
        queryString = queryString + "&";
      }
      queryString = queryString + param + "=" + queryStringParams[param];
    });

    // Each Datasource will get its own $customFilter entry.
    if (this.customFilters && this.customFilters.length > 0) {
      this.customFilters.forEach((cf) => {
        if (queryString.length > 0) {
          queryString = queryString + "&";
        }
        queryString = queryString + "$customfilter" + "=" + cf;
      });
    }

    if (queryString.length > 0) {
      url = url + "?" + queryString;
    }
    return url;
  }
  /**
   * Builds the linkage filter using the current record from the parent datasource
   * @returns {string} returns OData string containing the linkage filter
   */
  getLinkageFilter() {
    let result: string;
    this.linkages.forEach((link) => {
      if (!result) {
        result = "";
      } else {
        result = result + " and ";
      }
      result = result + link.childProperty;
      result = result + " eq ";
      result = result + "'" + this.parent.currentRecord[link.parentProperty] + "'";
    });
    return result;
  }

  getOrderByClause() {
    if (!this.activeOrderBy) {
      return;
    }
    let orderby = this.getOrderBy(this.activeOrderBy);
    if (!orderby) {
      return;
    }
    let result = "";
    orderby.properties.forEach((prop) => {
      if (result !== "") {
        result = result + ",";
      }
      result = result + prop.property;
      if (prop.descending) {
        result = result + " desc";
      }
    });
    if (result.length <= 0) {
      result = undefined;
    }
    return result;
  }
  getFilter() {
    let result;
    if (this.parent !== undefined) {
      result = this.getLinkageFilter();
    }
    if (this.currentQBEString !== undefined) {
      if (result !== undefined) {
        result = result + ` and (${this.currentQBEString})`;
      } else {
        result = `(${this.currentQBEString})`;
      }
    }
    if (this.gridFilters !== undefined) {
      if (result !== undefined) {
        result += ` and (${this.gridFilters})`;
      } else {
        result = `(${this.gridFilters})`;
      }
    }
    return result;
  }

  // private internalActiveOrderBy: string;
  // get activeOrderBy(): string {
  //     if (!this.internalActiveOrderBy) {
  //         if (this.defaultOrderBy) {
  //             this.internalActiveOrderBy = this.defaultOrderBy;
  //         }
  //     }
  //     return this.internalActiveOrderBy;
  // }

  // set activeOrderBy(orderBy: string) {
  //     this.internalActiveOrderBy = orderBy;
  //     // these next two lines will work fine for now as pass one but need to be refactored
  //     // into a reload datasource action
  //     this.initializePageManager();
  //     this.$gotoRecord(0, true).subscribe((result) => { });
  // }

  /**
   * return the order by definition or undefined if not found
   * @param orderby
   * @returns {OrderByDef}
   */
  getOrderBy(orderby: string) {
    if (this.orderBys) {
      for (let index = 0; index < this.orderBys.length; index++) {
        if (this.orderBys[index].description === orderby) {
          return this.orderBys[index];
        }
      }
    }
  }
}

//   return AdvancedControl;
// });
class PSScreenInfo {
    mask: string;
    runtimeMask?: string;
    subsystem: string;
    subsystemPath: string;
    basePath: string;
    screenDef: any;
    isProduction: boolean;
}

class HttpGetApi {
  constructor(
      // @Inject(PS_API_URLBASE) private baseurl: string,
              //  public defaultOptions: RequestOptions,
              //  public http: Http
              ) { }

  get(dataRoute): Observable<Response> {
      let url = this.baseurl + dataRoute;
      let options = this.defaultOptions.merge({
          url: url
      });
      let req = new Request(options);
      return this.http.request(req);
  }

  class HttpGetData {
      constructor(
          // @Inject(PS_DATA_URLBASE) private baseurl: string,
          //         private defaultOptions: RequestOptions,
          //         private http: Http
              ) { }

      get(dataRoute): Observable<Response> {
          let url = this.baseurl + dataRoute;
          let options = this.defaultOptions.merge({
              url: url
          });
          let req = new Request(options);
          return this.http.request(req);
      }
  }

  const PS_HTTPCLIENT_PROVIDERS = [
    { provide: PS_DATA_URLBASE, useValue: screenData.basePath + "/data/finance/legacy/" },
    { provide: PS_API_URLBASE, useValue: screenData.basePath + "/api/finance/legacy/" },
    { provide: PS_GATEWAY_URLBASE, useValue: screenData.basePath + "/gateway/" },
    HttpGetData,
    HttpPostData,
    HttpGetApi,
    HttpPostApi,
    HttpDeleteData,
    {provide: RequestOptions, useClass: PSRequestOptions },
];


class PSRequestOptions extends BaseRequestOptions {
  constructor() {
      super();
      let runtimeMask = screenData.runtimeMask || screenData.mask;
      this.headers = new Headers({ Mask: screenData.mask, RuntimeMask: runtimeMask });
      // Note: The ledgers are synced up in the CurrentLedgers service.
      this.headers.append("Content-Type", "application/json");
  }
}
/**
 * Creates a request options object to be optionally provided when instantiating a
 * {\@link Request}.
 * 
 * This class is based on the `RequestInit` description in the [Fetch
 * Spec](https://fetch.spec.whatwg.org/#requestinit).
 * 
 * All values are null by default. Typical defaults can be found in the {\@link BaseRequestOptions}
 * class, which sub-classes `RequestOptions`.
 * 
 * ```typescript
 * import {RequestOptions, Request, RequestMethod} from '\@angular/http';
 * 
 * const options = new RequestOptions({
 *   method: RequestMethod.Post,
 *   url: 'https://google.com'
 * });
 * const req = new Request(options);
 * console.log('req.method:', RequestMethod[req.method]); // Post
 * console.log('options.url:', options.url); // https://google.com
 * ```
 * 
 * \@experimental
 */
export class RequestOptions {
  /**
   * Http method with which to execute a {\@link Request}.
   * Acceptable methods are defined in the {\@link RequestMethod} enum.
   */
  method: RequestMethod|string|null;
  /**
   * {\@link Headers} to be attached to a {\@link Request}.
   */
  headers: Headers|null;
  /**
   * Body to be used when creating a {\@link Request}.
   */
  body: any;
  /**
   * Url with which to perform a {\@link Request}.
   */
  url: string|null;
  /**
   * Search parameters to be included in a {\@link Request}.
   */
  params: URLSearchParams;
  /**
   * @deprecated from 4.0.0. Use params instead.
   * @return {?}
   */
  get search(): URLSearchParams { return this.params; }
  /**
   * @deprecated from 4.0.0. Use params instead.
   * @param {?} params
   * @return {?}
   */
  set search(params: URLSearchParams) { this.params = params; }
  /**
   * Enable use credentials for a {\@link Request}.
   */
  withCredentials: boolean|null;
    /*
     * Select a buffer to store the response, such as ArrayBuffer, Blob, Json (or Document)
     */
    responseType: ResponseContentType|null;
  /**
   * @param {?=} opts
   */
  constructor(opts: RequestOptionsArgs = {}) {
      const {method, headers, body, url, search, params, withCredentials, responseType} = opts;
      this.method = method != null ? normalizeMethodName(method) : null;
      this.headers = headers != null ? headers : null;
      this.body = body != null ? body : null;
      this.url = url != null ? url : null;
      this.params = this._mergeSearchParams(params || search);
      this.withCredentials = withCredentials != null ? withCredentials : null;
      this.responseType = responseType != null ? responseType : null;
    }
  /**
   * Creates a copy of the `RequestOptions` instance, using the optional input as values to override
   * existing values. This method will not change the values of the instance on which it is being
   * called.
   * 
   * Note that `headers` and `search` will override existing values completely if present in
   * the `options` object. If these values should be merged, it should be done prior to calling
   * `merge` on the `RequestOptions` instance.
   * 
   * ```typescript
   * import {RequestOptions, Request, RequestMethod} from '\@angular/http';
   * 
   * const options = new RequestOptions({
   *   method: RequestMethod.Post
   * });
   * const req = new Request(options.merge({
   *   url: 'https://google.com'
   * }));
   * console.log('req.method:', RequestMethod[req.method]); // Post
   * console.log('options.url:', options.url); // null
   * console.log('req.url:', req.url); // https://google.com
   * ```
   * @param {?=} options
   * @return {?}
   */
  merge(options?: RequestOptionsArgs): RequestOptions {
      return new RequestOptions({
        method: options && options.method != null ? options.method : this.method,
        headers: options && options.headers != null ? options.headers : new Headers(this.headers),
        body: options && options.body != null ? options.body : this.body,
        url: options && options.url != null ? options.url : this.url,
        params: options && this._mergeSearchParams(options.params || options.search),
        withCredentials: options && options.withCredentials != null ? options.withCredentials :
                                                                      this.withCredentials,
        responseType: options && options.responseType != null ? options.responseType :
                                                                this.responseType
      });
    }
  /**
   * @param {?=} params
   * @return {?}
   */
  private _mergeSearchParams(params?: string|URLSearchParams|{[key: string]: any | any[]}|
                               null): URLSearchParams {
      if (!params) return this.params;
  
      if (params instanceof URLSearchParams) {
        return params.clone();
      }
  
      if (typeof params === 'string') {
        return new URLSearchParams(params);
      }
  
      return this._parseParams(params);
    }
  /**
   * @param {?=} objParams
   * @return {?}
   */
  private _parseParams(objParams: {[key: string]: any | any[]} = {}): URLSearchParams {
      const /** @type {?} */ params = new URLSearchParams();
      Object.keys(objParams).forEach((key: string) => {
        const /** @type {?} */ value: any|any[] = objParams[key];
        if (Array.isArray(value)) {
          value.forEach((item: any) => this._appendParam(key, item, params));
        } else {
          this._appendParam(key, value, params);
        }
      });
      return params;
    }
  /**
   * @param {?} key
   * @param {?} value
   * @param {?} params
   * @return {?}
   */
  private _appendParam(key: string, value: any, params: URLSearchParams): void {
      if (typeof value !== 'string') {
        value = JSON.stringify(value);
      }
      params.append(key, value);
    }
  }
  
  function RequestOptions_tsickle_Closure_declarations() {
  /**
   * Http method with which to execute a {\@link Request}.
   * Acceptable methods are defined in the {\@link RequestMethod} enum.
   * @type {?}
   */
  RequestOptions.prototype.method;
  /**
   * {\@link Headers} to be attached to a {\@link Request}.
   * @type {?}
   */
  RequestOptions.prototype.headers;
  /**
   * Body to be used when creating a {\@link Request}.
   * @type {?}
   */
  RequestOptions.prototype.body;
  /**
   * Url with which to perform a {\@link Request}.
   * @type {?}
   */
  RequestOptions.prototype.url;
  /**
   * Search parameters to be included in a {\@link Request}.
   * @type {?}
   */
  RequestOptions.prototype.params;
  /**
   * Enable use credentials for a {\@link Request}.
   * @type {?}
   */
  RequestOptions.prototype.withCredentials;
  /** @type {?} */
  RequestOptions.prototype.responseType;
  }
  
  /**
   * Subclass of {\@link RequestOptions}, with default values.
   * 
   * Default values:
   *  * method: {\@link RequestMethod RequestMethod.Get}
   *  * headers: empty {\@link Headers} object
   * 
   * This class could be extended and bound to the {\@link RequestOptions} class
   * when configuring an {\@link Injector}, in order to override the default options
   * used by {\@link Http} to create and send {\@link Request Requests}.
   * 
   * ```typescript
   * import {BaseRequestOptions, RequestOptions} from '\@angular/http';
   * 
   * class MyOptions extends BaseRequestOptions {
   *   search: string = 'coreTeam=true';
   * }
   * 
   * {provide: RequestOptions, useClass: MyOptions};
   * ```
   * 
   * The options could also be extended when manually creating a {\@link Request}
   * object.
   * 
   * ```
   * import {BaseRequestOptions, Request, RequestMethod} from '\@angular/http';
   * 
   * const options = new BaseRequestOptions();
   * const req = new Request(options.merge({
   *   method: RequestMethod.Post,
   *   url: 'https://google.com'
   * }));
   * console.log('req.method:', RequestMethod[req.method]); // Post
   * console.log('options.url:', options.url); // null
   * console.log('req.url:', req.url); // https://google.com
   * ```
   * 
   * \@experimental
   */
  export class BaseRequestOptions extends RequestOptions {
  constructor() { super({method: RequestMethod.Get, headers: new Headers()}); }
  static decorators: DecoratorInvocation[] = [
  { type: Injectable },
  ];
  /**
   * @nocollapse
   */
  static ctorParameters: () => ({type: any, decorators?: DecoratorInvocation[]}|null)[] = () => [
  ];
  }
  
  function BaseRequestOptions_tsickle_Closure_declarations() {
  /** @type {?} */
  BaseRequestOptions.decorators;
  /**
   * @nocollapse
   * @type {?}
   */
  BaseRequestOptions.ctorParameters;
  }
  
  
  interface DecoratorInvocation {
    type: Function;
    args?: any[];
  }

  
  /**
 * Creates a response options object to be optionally provided when instantiating a
 * {\@link Response}.
 * 
 * This class is based on the `ResponseInit` description in the [Fetch
 * Spec](https://fetch.spec.whatwg.org/#responseinit).
 * 
 * All values are null by default. Typical defaults can be found in the
 * {\@link BaseResponseOptions} class, which sub-classes `ResponseOptions`.
 * 
 * This class may be used in tests to build {\@link Response Responses} for
 * mock responses (see {\@link MockBackend}).
 * 
 * ### Example ([live demo](http://plnkr.co/edit/P9Jkk8e8cz6NVzbcxEsD?p=preview))
 * 
 * ```typescript
 * import {ResponseOptions, Response} from '\@angular/http';
 * 
 * var options = new ResponseOptions({
 *   body: '{"name":"Jeff"}'
 * });
 * var res = new Response(options);
 * 
 * console.log('res.json():', res.json()); // Object {name: "Jeff"}
 * ```
 * 
 * \@experimental
 */
export class ResponseOptions {
  /**
   * String, Object, ArrayBuffer or Blob representing the body of the {\@link Response}.
   */
  body: string|Object|ArrayBuffer|Blob|null;
  /**
   * Http {\@link http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html status code}
   * associated with the response.
   */
  status: number|null;
  /**
   * Response {\@link Headers headers}
   */
  headers: Headers|null;
  /**
   * \@internal
   */
  statusText: string|null;
  /**
   * \@internal
   */
  type: ResponseType|null;
    url: string|null;
  /**
   * @param {?=} opts
   */
  constructor(opts: ResponseOptionsArgs = {}) {
      const {body, status, headers, statusText, type, url} = opts;
      this.body = body != null ? body : null;
      this.status = status != null ? status : null;
      this.headers = headers != null ? headers : null;
      this.statusText = statusText != null ? statusText : null;
      this.type = type != null ? type : null;
      this.url = url != null ? url : null;
    }
  /**
   * Creates a copy of the `ResponseOptions` instance, using the optional input as values to
   * override
   * existing values. This method will not change the values of the instance on which it is being
   * called.
   * 
   * This may be useful when sharing a base `ResponseOptions` object inside tests,
   * where certain properties may change from test to test.
   * 
   * ### Example ([live demo](http://plnkr.co/edit/1lXquqFfgduTFBWjNoRE?p=preview))
   * 
   * ```typescript
   * import {ResponseOptions, Response} from '\@angular/http';
   * 
   * var options = new ResponseOptions({
   *   body: {name: 'Jeff'}
   * });
   * var res = new Response(options.merge({
   *   url: 'https://google.com'
   * }));
   * console.log('options.url:', options.url); // null
   * console.log('res.json():', res.json()); // Object {name: "Jeff"}
   * console.log('res.url:', res.url); // https://google.com
   * ```
   * @param {?=} options
   * @return {?}
   */
  merge(options?: ResponseOptionsArgs): ResponseOptions {
      return new ResponseOptions({
        body: options && options.body != null ? options.body : this.body,
        status: options && options.status != null ? options.status : this.status,
        headers: options && options.headers != null ? options.headers : this.headers,
        statusText: options && options.statusText != null ? options.statusText : this.statusText,
        type: options && options.type != null ? options.type : this.type,
        url: options && options.url != null ? options.url : this.url,
      });
    }
  }
  
  function ResponseOptions_tsickle_Closure_declarations() {
  /**
   * String, Object, ArrayBuffer or Blob representing the body of the {\@link Response}.
   * @type {?}
   */
  ResponseOptions.prototype.body;
  /**
   * Http {\@link http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html status code}
   * associated with the response.
   * @type {?}
   */
  ResponseOptions.prototype.status;
  /**
   * Response {\@link Headers headers}
   * @type {?}
   */
  ResponseOptions.prototype.headers;
  /**
   * \@internal
   * @type {?}
   */
  ResponseOptions.prototype.statusText;
  /**
   * \@internal
   * @type {?}
   */
  ResponseOptions.prototype.type;
  /** @type {?} */
  ResponseOptions.prototype.url;
  }
  
  /**
   * Subclass of {\@link ResponseOptions}, with default values.
   * 
   * Default values:
   *  * status: 200
   *  * headers: empty {\@link Headers} object
   * 
   * This class could be extended and bound to the {\@link ResponseOptions} class
   * when configuring an {\@link Injector}, in order to override the default options
   * used by {\@link Http} to create {\@link Response Responses}.
   * 
   * ### Example ([live demo](http://plnkr.co/edit/qv8DLT?p=preview))
   * 
   * ```typescript
   * import {provide} from '\@angular/core';
   * import {bootstrap} from '\@angular/platform-browser/browser';
   * import {HTTP_PROVIDERS, Headers, Http, BaseResponseOptions, ResponseOptions} from
   * '\@angular/http';
   * import {App} from './myapp';
   * 
   * class MyOptions extends BaseResponseOptions {
   *   headers:Headers = new Headers({network: 'github'});
   * }
   * 
   * bootstrap(App, [HTTP_PROVIDERS, {provide: ResponseOptions, useClass: MyOptions}]);
   * ```
   * 
   * The options could also be extended when manually creating a {\@link Response}
   * object.
   * 
   * ### Example ([live demo](http://plnkr.co/edit/VngosOWiaExEtbstDoix?p=preview))
   * 
   * ```
   * import {BaseResponseOptions, Response} from '\@angular/http';
   * 
   * var options = new BaseResponseOptions();
   * var res = new Response(options.merge({
   *   body: 'Angular',
   *   headers: new Headers({framework: 'angular'})
   * }));
   * console.log('res.headers.get("framework"):', res.headers.get('framework')); // angular
   * console.log('res.text():', res.text()); // Angular;
   * ```
   * 
   * \@experimental
   */
  export class BaseResponseOptions extends ResponseOptions {
  constructor() {
      super({status: 200, statusText: 'Ok', type: ResponseType.Default, headers: new Headers()});
    }
  static decorators: DecoratorInvocation[] = [
  { type: Injectable },
  ];
  /**
   * @nocollapse
   */
  static ctorParameters: () => ({type: any, decorators?: DecoratorInvocation[]}|null)[] = () => [
  ];
  }
  
  function BaseResponseOptions_tsickle_Closure_declarations() {
  /** @type {?} */
  BaseResponseOptions.decorators;
  /**
   * @nocollapse
   * @type {?}
   */
  BaseResponseOptions.ctorParameters;
  }
  
  
  interface DecoratorInvocation {
    type: Function;
    args?: any[];
  }

  
  // In Angular2 RC1, we cannot inject anything anymore from app providers into BaseRequestOptions
// so this is a workaround for now.
import {BaseRequestOptions, Headers} from "@angular/http";
import {PSScreenInfo} from "./ps-screeninfo";
declare let screenData: PSScreenInfo;

export class PSRequestOptions extends BaseRequestOptions {
    constructor() {
        super();
        let runtimeMask = screenData.runtimeMask || screenData.mask;
        this.headers = new Headers({ Mask: screenData.mask, RuntimeMask: runtimeMask });
        // Note: The ledgers are synced up in the CurrentLedgers service.
        this.headers.append("Content-Type", "application/json");
    }
}