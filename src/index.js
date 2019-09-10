'use strict';

// data-async-busy="true" (is true when form is submitting)
// data-async-value="_value"
// data-async-root="body"
// data-async-title="page title"
// data-async-scripts="scripts" (add to run scripts inside target node)

// we'll catch all form submissions
document.addEventListener('submit', handleFormSubmit);

// set base page title if not already set
const dE = document.documentElement;
dE.dataset.asyncTitle = document.title;

// selector to content root
const contentQuery = dE.dataset.asyncRoot || 'body';

// a list of pages we navigated to
const pages = [];

function handleFormSubmit(e) {
    
    const isAsyncForm = e.target.dataset.async === '';

    // we only deal with async forms
    if (!isAsyncForm) return;

    // route to async handler
    handleAsyncFormSubmit(e);
};

function handleAsyncFormSubmit(e) {

    // we'll submit the form manually
    e.preventDefault();

    // quick reference to form
    const form = e.target;

    // already busy submitting, exit
    if (form.dataset.asyncBusy === 'true') return;

    // remember this page
    pages.push({
        url: window.location.href,
        doc: dE.cloneNode(true),
        query: contentQuery
    });

    // set to busy
    form.dataset.asyncBusy = true;

    // needed for request
    const method = form.getAttribute('method');
    const action = form.getAttribute('action');

    // prepare data
    // as IE11 does not support set/delete we create an empty form data object and append to it (following same rules as FormData constructor)
    const formData = new FormData();

    // add form field data
    toArray(form.elements)
        .filter(hasName)
        .filter(notDisabled)
        .filter(checkedIfCheckabled)
        .filter(selectedIfSelectable)
        .forEach(element => {
            getValues(element, { valueKey: element.dataset.asyncValue || '_value' })
                .forEach(value => formData.append(element.name, value))
        });
    
    // create loading indicator
    const busyRoot = document.createElement('div');
    document.querySelector(contentQuery).appendChild(busyRoot);

    // send the form asynchronously
    const xhr = new XMLHttpRequest();

    // show progress indicator
    (method === 'POST' ? xhr.upload : xhr).onprogress = e => {
        updateProgress(busyRoot, e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : false );
    };

    // handle complete state
    xhr.onload = () => navigateTo(action, xhr.response, contentQuery);
    xhr.open(method, action);
    xhr.responseType = 'document';
    xhr.send(formData);
};

const updateProgress = (indicator, value) => 
indicator.innerHTML = value === false ? 
    `<progress><span>Busy...</span></progress>` : 
    `<progress min="0" max="100" value="${value}">
        <span>${value}</span>%
    </progress>`;

window.addEventListener('popstate', e => restoreTo((e.state || {}).index || 0));

const restoreTo = (index) => {
    const { url, doc, query } = pages[index];
    replaceContent(doc.cloneNode(true), query);
    history.replaceState({ index }, document.title, url);
};

const navigateTo = (url, doc, query) => {

    // replace page content with newly received content
    replaceContent(doc.cloneNode(true), query);

    // update URL and add new entry
    history.pushState({ index: pages.length }, document.title, url);

    // remember for future navigation
    pages.push({ url, doc, query });
};





const replaceContent = (doc, query) => {
    
    // get target to replace in current document
    const target = document.querySelector(query);
    
    // set new title
    document.title = getTitle(doc);

    // set new content
    const content = doc.querySelector(query);
    target.parentNode.replaceChild(content, target);

    // run scripts
    const scriptsFilter = getDataAttributeValue(doc, 'data-async-scripts');
    if (typeof scriptsFilter !== 'undefined') {
        runScripts(content, scriptsFilter === '' ? 'script' : scriptsFilter);
    }
};

const getDataAttributeValue = (root, name) => {
    const el = root.querySelector(`[${name}]`);
    return el ? el.getAttribute(name) : root.getAttribute(name);
};

const getTitle = doc => getDataAttributeValue(doc, 'data-async-title');

const runScripts = (root, query) => toArray(root.querySelectorAll(query)).forEach(runScript);

const runScript = script => {
    const s = document.createElement('script');
    s.textContent = script.textContent;
    copyAttributes(script, s);
    script.parentNode.insertBefore(s, script);
    script.parentNode.removeChild(script);
};

const copyAttributes = (origin, target) => toArray(origin.attributes)
    .forEach(a => target.setAttribute(a.name, a.value));

const getValues = (element, { valueKey }) => {
    if (isSelectable(element)) {
        return getSelectedOptions(element).map(option => option.value);
    }
    if (isFileInput(element)) {
        return element[valueKey] || toArray(element.files);
    }
    return [element[valueKey] || element.value];
};

const toArray = items => items ? Array.from(items) : [];

const hasName = element => element.name;

const notDisabled = element => !element.disabled;

const isFileInput = element => !!element.files;

const isCheckabled = element => /checkbox|radio/.test(element.type);

const checkedIfCheckabled = element => isCheckabled(element) ? element.checked : true;

const isSelectable = element => element.nodeName === 'SELECT';

const selectedIfSelectable = element => isSelectable(element) ? getSelectedOptions(element).length > 0 : true;

const getSelectedOptions = element => {
    return element.selectedOptions ? toArray(element.selectedOptions) : toArray(element.options).filter(option => option.selected)
}
