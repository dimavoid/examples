const TOP_CATEGORY = document.getElementById('top-category').dataset.topCategory;

const InstitutionsList = new Vue({
  el: '#institutions-list',
  delimiters: ['${', '}'],
  data: {
    items: [],
    nextItems: '',
    address: '',
    pos: {
      lat: 45.0515205,
      lng: 38.9540696
    },
    polygon: {
      id: '',
      name: ''
    },
    maxCost: 5000,
    stickers: [],
    stickersHidden: [],
    categories: [],
    categoriesHidden: [],
    filters: {
      range: 1500,
      stickers: [],
      categories: [],
      payments: ['online', 'cash', 'card'],
      search: null,
      sort: null
    },
    defaultFilters: {}
  },
  created: function() {
    const params = (new URL(document.location)).searchParams;

    const counterItems = (items, name, amount, scope = this) => {
      const iter = (counter = 0) => {
        if (counter >= items.length) return;

        if (counter <= amount) {
          scope[`${name}`].push(_.cloneDeep(items[counter]));
        } else {
          scope[`${name}Hidden`].push(_.cloneDeep(items[counter]));
        }

        return iter(counter + 1);
      };

      return iter();
    };

    this.defaultFilters = _.cloneDeep(this.filters);
    this.filters.range = +params.get('range') || this.defaultFilters.range;
    this.filters.stickers = params.getAll('sticker').map(i => +i);
    this.filters.categories = params.getAll('category').map(i => +i);
    this.filters.search = params.get('search') ? params.get('search') : null;
    this.filters.sort = params.get('ordering') || null;

    if (params.get('search')) {
      this.filters.payments = []
    } else {
      const payments = [];

      if (params.get('online')) payments.push('online');
      if (params.get('cash')) payments.push('cash');
      if (params.get('card')) payments.push('card');
  
      this.filters.payments = payments.length ? payments : this.defaultFilters.payments;
    }

    this.requestAddress()
      .then(() => this.requestPolygon())
      .then(() => this.onFilter())
      .then(() => document.getElementById('items').hidden = false)

    fetch(`${API_URL}/api/site/configurations/stickers/${TOP_CATEGORY}/`)
      .then(stat)
      .then(json)
      .then(res => counterItems(res, 'stickers', 5))
      .then(() => document.querySelector('.param').hidden = false);

    fetch(`${API_URL}/api/site/categories/categories/${TOP_CATEGORY}/`)
      .then(stat)
      .then(json)
      .then(res => counterItems(res, 'categories', 5))
      .then(() => document.querySelector('.category').hidden = false)
  },
  methods: {
    requestItems: _.debounce(function(str) {
      return fetch(`${API_URL}/api/site/institution/topcategory/${TOP_CATEGORY}/${str}`)
        .then(stat)
        .then(json)
        .then(res => {
          // console.log('REQUEST ITEMS', res);

          this.items = _.cloneDeep(res.results);
          this.nextItems = res.next;
        })
        .catch(res => {
          // console.error(`REQUEST ITEMS`, res);

          Promise.resolve(res).then(json).then(res => {
            // console.log('ERROR REQUEST ITEMS', res);
          })
        })
    }, 1000),
    requestNextItems: function() {
      return fetch(`${this.nextItems}`)
        .then(stat)
        .then(json)
        .then(res => {
          // console.log('REQUEST NEXT ITEMS', res);
          const results = _.cloneDeep(res.results);

          for (let i = 0; i < results.length; i++) {
            this.items.push(results[i]);
          }

          this.nextItems = res.next;
        })
        .catch(res => {
          // console.error(`REQUEST NEXT ITEMS`, res);

          Promise.resolve(res).then(json).then(res => {
            // console.log('ERROR REQUEST NEXT ITEMS', res);
          })
        })
    },
    requestCoords: function() {
      const str = `address=Краснодар${this.address.replace(/\s+/g, '+')}`;
      
      return fetch(`${GEOCODE_API}${str}&components=administrative_area:Краснодар&key=${API_KEY}`)
        .then(stat)
        .then(json)
        .then(res => {
          // console.log('REQUEST COORDS', res);
          
          this.pos.lat = res.results[0].geometry.location.lat;
          this.pos.lng = res.results[0].geometry.location.lng;
        })
        .catch(res => {
          // console.error(`REQUEST COORDS`, res);

          Promise.resolve(res).then(json).then(res => {
            // console.log('ERROR REQUEST COORDS', res);
          })
        })
    },
    requestAddress: function() {
      const str = `latlng=${this.pos.lat},${this.pos.lng}`;

      return fetch(`${GEOCODE_API}${str}&key=${API_KEY}`)
        .then(stat)
        .then(json)
        .then(res => {
          // console.log('REQUEST ADDRESS', res);
          this.address = res.results[0].formatted_address.split(',').slice(0, 3).join(',');
        })
        .catch(res => {
          // console.error(`REQUEST ADDRESS`, res);

          Promise.resolve(res).then(json).then(res => {
            // console.log('ERROR REQUEST ADDRESS', res);
          })
        })
    },
    requestPolygon: function() {
      const pos = {
        latitude: this.pos.lat,
        longitude: this.pos.lng
      };

      return fetch(`${API_URL}/api/site/configurations/check-coordinates/`, {
        method: 'post',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify(pos)
      })
        .then(stat)
        .then(json)
        .then(res => {
          // console.log('REQUEST POLYGON', res);

          this.polygon.id = res.polygon.id;
          this.polygon.name = res.polygon.name;
        })
        .catch(res => {
          // console.error(`REQUEST POLYGON`, res);

          Promise.resolve(res).then(json).then(res => {
            // console.log('ERROR REQUEST POLYGON', res);
          })
        })
    },
    searchByAddress: function(e) {
      this.address = e.target.address.value;

      this.requestCoords()
        .then(() => this.requestAddress())
        .then(() => this.requestPolygon())
        .then(() => this.onFilter())   
    },
    openInstitution: function(item) {
      window.open(`/institution/${ item.institution.id }/menu/`);
    },
    onFilter: _.debounce(function(e) {
      if (e && e.target.id === 'custom-handle') {
        const newRange = Math.round(this.maxCost * parseFloat(e.target.style.left) / 100);

        if (this.filters.range === newRange) return;

        this.filters.range = newRange;
      }

      const range = `?min_cost=${this.filters.range}`;
      const stickers = this.filters.stickers.map(sticker => `&sticker=${sticker}`).join('');
      const categories = this.filters.categories.map(category => `&category=${category}`).join('');
      const payments = this.filters.payments.map(pay => `&${pay}=True`).join('');
      const search = this.filters.search ? `&search=${this.filters.search}` : '';
      const sort = this.filters.sort ? `&ordering=${this.filters.sort}` : '';

      const str = `${range}${stickers}${categories}${payments}${sort}${search}`;

      history.replaceState(null, null, str);
      this.requestItems(str);
    }, 10),
    onSort: function(e) {
      this.filters.sort = e.currentTarget.name;

      this.onFilter(e);
    },
    onReset: function(e) {
      this.filters = _.cloneDeep(this.defaultFilters);
      this.onFilter(e);
    }
  }
});