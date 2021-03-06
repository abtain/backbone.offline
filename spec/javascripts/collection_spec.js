(function() {

  describe('Offline.Collection', function() {
    beforeEach(function() {
      localStorage.setItem('dreams', '');
      this.dreams = new Dreams();
      return this.collection = new Offline.Collection(this.dreams);
    });
    afterEach(function() {
      return localStorage.clear();
    });
    describe('dirty', function() {
      return it('should return items where "dirty" attribute is equal true', function() {
        this.dreams.add([
          {
            id: 1,
            dirty: false
          }, {
            id: 2,
            dirty: true
          }, {
            id: 3,
            dirty: false
          }
        ]);
        return expect(this.collection.dirty().length).toEqual(1);
      });
    });
    describe('get', function() {
      return it('should find item by "sid" attribute in collection', function() {
        this.dreams.add([
          {
            name: 'first',
            sid: '1'
          }, {
            name: 'second',
            sid: '2'
          }
        ]);
        return expect(this.collection.get('2').get('name')).toEqual('second');
      });
    });
    describe('destroyDiff', function() {
      beforeEach(function() {
        this.dreams.create({
          name: 'item 1',
          sid: '1'
        });
        this.dreams.create({
          name: 'item 2',
          sid: '2'
        });
        return this.dreams.create({
          name: 'item 3',
          sid: '3'
        });
      });
      it('should destroy items by "sid" which difference from response', function() {
        var response;
        response = [
          {
            name: 'item 1',
            id: '2'
          }
        ];
        this.collection.destroyDiff(response);
        return expect(this.collection.items.pluck('sid')).toEqual(['2']);
      });
      return it('should ignore items which have "sid" attribute equal "new"', function() {
        var response;
        response = [
          {
            name: 'item 1',
            id: '1'
          }
        ];
        this.dreams.create({
          name: 'item 4',
          sid: 'new'
        });
        this.collection.destroyDiff(response);
        return expect(this.collection.items.pluck('sid')).toEqual(['1', 'new']);
      });
    });
    return describe('fakeModel', function() {
      beforeEach(function() {
        return this.fakeModel = this.collection.fakeModel('4');
      });
      it('sets id', function() {
        return expect(this.fakeModel.id).toEqual('4');
      });
      return it('sets urlRoot', function() {
        return expect(this.fakeModel.urlRoot).toEqual('/api/dreams');
      });
    });
  });

}).call(this);
