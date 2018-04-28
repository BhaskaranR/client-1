import { Injectable } from '@angular/core';

export interface MenuItem {
  id: string;
  name: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  items?: MenuItem[];
  summary?: string;
}

const SOCIAL = 'social';
const BUSINESS = 'business';
const MARKET = 'market';

export const SECTIONS = {
  [SOCIAL]: 'Social',
  [BUSINESS]: 'Business',
  [MARKET]: 'Market Place',
};


const DOCS: { [key: string]: MenuCategory[] } = {
  [SOCIAL]: [
    {
      id: 'feeds',
      name: 'Feeds',
      items: [
        { id: 'featured', name: 'Featured'},
        { id: 'media', name: 'Media'}
      ]
    },
    {
      id: 'myprofile',
      name: 'My Profile',
      items: [
        { id: 'myBusiness', name: 'Business'},
        { id: 'myShops', name: 'Shops'}
      ]
    },
    {
      id: 'people',
      name: 'People',
      items: [
        { id: 'following', name: 'Following'},
        { id: 'followers', name: 'Followers'},
        { id: 'suggestions', name: 'Suggestions'},
      ]
    }
  ],
  [BUSINESS]: [
    {
      id: 'business',
      name: 'Business',
      items: [
        { id: 'myBusiness', name: 'Business'},
        { id: 'bizFollowing', name: 'Following'},
        { id: 'suggestions', name: 'Suggestions'}
      ]
    },
    {
      id : 'nearby',
      name: 'Near By',
      items: [
        { id: 'deals', name: 'Deals'},
        { id: 'business', name: 'Business'}
      ]
    }
  ]
};

const ALL_COMPONENTS = DOCS[SOCIAL].reduce(
  (result, category) => result.concat(category.items), []);
const ALL_DOCS = ALL_COMPONENTS;
const ALL_CATEGORIES = DOCS[SOCIAL];

@Injectable()
export class MenuItems {
  getCategories(section: string): MenuCategory[] {
    return DOCS[section];
  }

  getItems(section: string): MenuItem[] {
    if (section === SOCIAL) {
      return ALL_COMPONENTS;
    }
    return [];
  }

  getItemById(id: string, section: string): MenuItem {
    return ALL_DOCS.find(doc => doc.id === id && doc.packageName == section);
  }

  getCategoryById(id: string): MenuCategory {
    return ALL_CATEGORIES.find(c => c.id == id);
  }
}
