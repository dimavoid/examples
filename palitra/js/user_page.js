'use strict'

Vue.config.devtools = true;

// const URL = `http://palitraapi.spider.ru`;
const URL = `http://palitra.spider.ru`;
const searchUser = document.location.href.match(/redactor\/(.*[^?])\?*/);
const USER = searchUser ? searchUser[1] : 2;

Vue.component('preloader-spinner', {
  template: `
    <div class="preloader-spinner">
      <div class="preloader-spinner__bounce1"></div>
      <div class="preloader-spinner__bounce2"></div>
      <div class="preloader-spinner__bounce3"></div>
    </div>
  `
});

Vue.component('preloader-points', {
  template: `
    <div class="preloader-points">
      <span></span>
      <span></span>
    </div>
  `
});

const ProductsTable = {
  props: [
    'brand',
    'products',
    'loading'
  ],
  template: `
    <div class="user-page__products">
      <table class="user-page__products-table" v-show="products.length">
        <tr>
          <th>
            <transition name="fade">
              <preloader-points v-show="brand.loading">
              </preloader-points>
            </transition>
            <label class="user-page__label-check">
              <input
                class="user-page__check"
                type="checkbox"
                :data-brand="brand.id"
                :checked="brand.selectedAll"
                @click.prevent="onAllToggle"
              >
            </label>
          </th>
          <th>Article</th>
          <th>Name</th>
          <th>Barcode</th>
        </tr>
        <tr class="user-page__product" v-for="(product, index) in products" :key="product.id">
          <td>
            <transition name="fade">
              <preloader-points v-show="product.loading">
              </preloader-points>
            </transition>
            <label class="user-page__label-check">
              <input
                class="user-page__check"
                type="checkbox"
                :data-id="product.id"
                :data-article="product.article"
                :data-brand="product.brand"
                :data-index="index"
                :checked="product.allow"
                @click.prevent="onToggle"
              >
            </label>
          </td>
          <td>{{ product.article }}</td>
          <td>{{ product.title }}</td>
          <td>{{ product.barcode }}</td>
        </tr>
      </table>
    </div>
  `,
  methods: {
    onToggle: function(e) {
      this.$emit('toggle', e);
    },
    onAllToggle: function(e) {
      this.$emit('all-toggle', e);
    }
  }
};

const UserPage = new Vue({
  el: '#user-page',
  delimiters: ['${', '}'],
  components: {
    'products-table': ProductsTable
  },
  data: {
    loading: false,
    brands: [],
    searchRequest: null,
    searchMessage: null,
    error: null
  },
  mounted: function() {
    this.getBrands();
  },
  methods: {
    getBrands: function() {
      fetch(`${URL}/api/v1/brands/?user=${USER}`, {
        method: 'GET'
      })
        .then(res => res.json())
        .then(res => {
          // console.log('GET BRANDS', res);
  
          if (!res.length) this.error = res.detail;
  
          if (res.length) {
            res.forEach(brand => {
              brand.show = false;
              brand.products = [];
              brand.selectedAll = brand.personally_available === brand.total;
              brand.loading = false;
            });
            
            this.loading = false;
            this.error = null;
            this.brands = res;
          }
        })
    },
    getProducts: function(id) {
      const parameters = id ? `brand=${id}` : `search=${this.searchRequest}`;

      return fetch(`${URL}/api/v1/product/permission/list/${USER}/?${parameters}`, {
        method: 'GET'
      })
        .then(res => res.json())
        .then(res => {
          // console.log(`GET PRODUCTS FOR ${ id ? 'BRAND' : 'SEARCH' }`, res);

          res.forEach(product => product.loading = false);
          this.loading = false;

          if (id) {
            this.brands.forEach(brand => {
              if (brand.id === id) brand.products = res;
            });
          }
          
          if (!id) {
            return res;
          }
        })
    },
    onToggleBrand: function(e) {
      // console.log('TOGGLE BRAND', e.currentTarget, e.target);
      const id = +e.currentTarget.dataset.id;
      const index = +e.currentTarget.dataset.index;
      const brand = this.brands[index];

      brand.show = !brand.show

      if (!brand.products.length) this.getProducts(id);
    },
    onToggleProduct: _.debounce(function(e) {
      // console.log('TOGGLE PRODUCT', e.currentTarget, e.target);
      const checked = e.target.checked;
      const id = +e.target.dataset.id;
      const article = e.target.dataset.article;
      const brandId = +e.target.dataset.brand;
      const index = +e.target.dataset.index;
      
      const brand = this.brands.find(brand => brand.id === brandId);
      const product = brand.products[index];

      product.loading = true;

      const data = {
        user:  USER,
        article: article,
        status: !checked
      }
      
      fetch(`${URL}/api/v1/product/permission/set/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
        .then(res => res.json())
        .then(res => {
          // console.log('TOGGLE PRODUCT RES', res);

          res.status ? brand.personally_available += 1 : brand.personally_available -= 1;

          brand.selectedAll = brand.personally_available === brand.total;

          product.allow = res.status;
          product.loading = false;
        })
    }, 200),
    onAllToggleProduct: _.debounce(function(e) {
      // console.log('ALL TOGGLE PRODUCT', e.currentTarget, e.target);
      const checked = e.target.checked;
      const brandId = +e.target.dataset.brand;

      const brand = this.brands.find(brand => brand.id === brandId);
      const products = brand.products.map(prod => prod.article);

      brand.loading = true;

      const data = {
        user:  USER,
        brand: brandId,
        status: !checked,
        articles: this.searchRequest ? products : []
      }

      fetch(`${URL}/api/v1/product/permission/set_all/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
        .then(res => res.json())
        .then(res => {
          // console.log('ALL TOGGLE PRODUCT RES', res);
          const length = res.articles.length;

          if (!length) {
            brand.products.forEach(prod => prod.allow = res.status);

            brand.personally_available = res.status ? brand.total : 0;
          } else {
            res.articles.forEach(art => {
              const product = brand.products.find(prod => prod.article === art);

              product.allow = res.status
            });

            res.status ? brand.personally_available += length : brand.personally_available -= length;
          }

          brand.loading = false;
          brand.selectedAll = res.status;
        })
    }, 200),
    onSearch: _.debounce(function(e) {
      const request = this.searchRequest.replace(/\s+/g,' ').trim();

      if(!request) {
        this.loading = true;
        this.searchMessage = null;
        this.getBrands();
      };

      if (request) {
        this.loading = true;

        this.getProducts().then(res => {
          if (!res.length) {
            this.searchMessage = 'No matches';
            this.brands = [];
          }

          if (res.length) {
            let brands = 0;
            let products = res.length;

            this.brands.forEach(brand => {
              const products = res.filter(prod => prod.brand === brand.id);
              brand.products = products;
              brand.selectedAll = products.every(prod => prod.allow === true);
              brand.show = !!products.length;
              brands += products.length ? 1 : 0;
            });

            this.searchMessage = `Total of ${products} matches for ${brands} brands`;

            this.brands = this.brands.filter(brand => brand.products.length);
            this.brand = this.brands.sort((a, b) => a.products.length < b.products.length);
          }
        });
      }
    }, 600),
    clearSearch: function(e) {
        this.searchRequest = '';
        this.onSearch(e);
    }
  }
});