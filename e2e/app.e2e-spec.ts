import { DeLICiousPage } from './app.po';

describe('de-licious App', () => {
  let page: DeLICiousPage;

  beforeEach(() => {
    page = new DeLICiousPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('lic works!');
  });
});
