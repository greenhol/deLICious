import { browser, element, by } from 'protractor';

export class DeLICiousPage {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('lic-root h1')).getText();
  }
}
