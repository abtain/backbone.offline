(function() {

  describe('Offline.Sync', function() {
    beforeEach(function() {
      localStorage.setItem('dreams', '');
      this.dreams = new Dreams();
      this.storage = this.dreams.storage;
      this.sync = this.storage.sync;
      return spyOn(Offline, "onLine").andReturn(true);
    });
    afterEach(function() {
      return localStorage.clear();
    });
    describe('ajax', function() {
      beforeEach(function() {
        this.dream = new Dream();
        return spyOn(Backbone, "ajaxSync");
      });
      it('should call Backbone.ajaxSync when onLine', function() {
        this.sync.ajax("read", this.dream, {});
        return expect(Backbone.ajaxSync).toHaveBeenCalledWith("read", this.dream, {});
      });
      it('should call Backbone.ajaxSync when onLine is undefined', function() {
        Offline.onLine.andReturn(void 0);
        this.sync.ajax("read", this.dream, {});
        return expect(Backbone.ajaxSync).toHaveBeenCalledWith("read", this.dream, {});
      });
      return it('should does nothing when offline', function() {
        Offline.onLine.andReturn(false);
        this.sync.ajax("read", this.dream, {});
        return expect(Backbone.ajaxSync.callCount).toBe(0);
      });
    });
    describe('full', function() {
      beforeEach(function() {
        this.options = {
          success: function(resp) {}
        };
        this.response = [
          {
            id: '1',
            name: 'Dream 1'
          }, {
            id: '2',
            name: 'Dream 2'
          }, {
            id: '3',
            name: 'Dream 3'
          }
        ];
        return registerFakeAjax({
          url: '/api/dreams',
          successData: this.response
        });
      });
      it('should clear storage', function() {
        spyOn(this.storage, 'clear');
        this.sync.full(this.options);
        return expect(this.storage.clear).toHaveBeenCalled();
      });
      it('should reset collection', function() {
        var resetCallback;
        resetCallback = jasmine.createSpy('-Success Callback-');
        this.sync.collection.items.on('reset', resetCallback);
        this.sync.full(this.options);
        return expect(resetCallback).toHaveBeenCalled();
      });
      it('should request data from server', function() {
        spyOn($, 'ajax');
        this.sync.full(this.options);
        return expect($.ajax).toHaveBeenCalledWith({
          type: 'GET',
          dataType: 'json',
          url: '/api/dreams',
          success: jasmine.any(Function)
        });
      });
      it('should store received data to localStorage', function() {
        this.sync.full(this.options);
        localStorage.removeItem('dreams');
        localStorage.removeItem('dreams-destroy');
        return expect(localStorage.length).toEqual(3);
      });
      it('should generate new id and store received data locally', function() {
        var id, _i, _len, _ref, _results;
        this.sync.full(this.options);
        expect(this.dreams.pluck("sid")).toEqual(['1', '2', '3']);
        _ref = this.dreams.pluck("id");
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          id = _ref[_i];
          _results.push(expect(id).toMatch(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/));
        }
        return _results;
      });
      it('should reload collection', function() {
        this.dreams.add([
          {
            id: '725261a0-4f59-2fe2-4827-f52315414d51',
            sid: '1',
            name: 'Dream 1'
          }, {
            id: 'b27a0bcb-eb05-1296-fe63-b2a06a7c7943',
            sid: '2',
            name: 'Dream 2'
          }
        ]);
        this.sync.full(this.options);
        return expect(this.dreams.length).toEqual(3);
      });
      it('does not mark loaded data as dirty', function() {
        var dirties;
        this.sync.full(this.options);
        dirties = this.dreams.filter(function(dream) {
          return dream.get('dirty');
        });
        return expect(dirties.length).toEqual(0);
      });
      return it('should call "options.success" with received data', function() {
        var callback;
        callback = jasmine.createSpy('-Success Callback-');
        this.options = {
          success: function(resp) {
            return callback(resp);
          }
        };
        this.sync.full(this.options);
        return expect(callback).toHaveBeenCalledWith(this.response);
      });
    });
    describe('incremental', function() {
      it('should call "pull"', function() {
        spyOn(this.sync, 'pull');
        this.sync.incremental();
        return expect(this.sync.pull).toHaveBeenCalledWith({
          success: jasmine.any(Function)
        });
      });
      return it('should call "push"', function() {
        registerFakeAjax({
          url: '/api/dreams',
          successData: {}
        });
        spyOn(this.sync, 'push');
        this.sync.incremental();
        return expect(this.sync.push).toHaveBeenCalledWith();
      });
    });
    describe('pull', function() {
      beforeEach(function() {
        this.dreams.create({
          name: 'item 1',
          sid: '1'
        });
        this.dreams.create({
          name: 'item 2',
          sid: '2'
        });
        this.response = [
          {
            name: 'updated item 2',
            id: '2'
          }, {
            name: 'item 3',
            id: '3'
          }
        ];
        return registerFakeAjax({
          url: '/api/dreams',
          successData: this.response
        });
      });
      it('should request data from server', function() {
        spyOn($, 'ajax');
        this.sync.pull();
        return expect($.ajax).toHaveBeenCalledWith({
          type: 'GET',
          dataType: 'json',
          url: '/api/dreams',
          success: jasmine.any(Function)
        });
      });
      it('should destroy old items', function() {
        spyOn(this.sync.collection, 'destroyDiff');
        this.sync.pull();
        return expect(this.sync.collection.destroyDiff).toHaveBeenCalledWith(this.response);
      });
      return it('should call "pullItem" for changed items', function() {
        spyOn(this.sync, 'pullItem');
        this.sync.pull();
        return expect(this.sync.pullItem.callCount).toBe(2);
      });
    });
    describe('pullItem', function() {
      beforeEach(function() {
        return this.dream = this.dreams.create({
          name: 'simple item',
          updated_at: '2012-03-04T14:00:10Z',
          sid: '1'
        }, {
          local: true
        });
      });
      it("should update local's item by sid", function() {
        this.sync.pullItem({
          id: '1',
          name: 'updated',
          updated_at: '2012-03-05T14:00:10Z'
        });
        return expect(this.dream.get('name')).toEqual('updated');
      });
      return it("should create new item when local's item does not find", function() {
        this.sync.pullItem({
          id: '2',
          name: 'create item'
        });
        return expect(this.sync.collection.get('2').get('name')).toEqual('create item');
      });
    });
    describe('createItem', function() {
      beforeEach(function() {
        this.item = {
          name: 'New',
          id: '1'
        };
        return this.collection = this.dreams.storage.sync.collection;
      });
      it('should create new item to collection', function() {
        spyOn(this.dreams, 'create');
        this.sync.createItem(this.item);
        return expect(this.dreams.create).toHaveBeenCalledWith({
          name: 'New',
          sid: '1'
        }, {
          local: true
        });
      });
      it('should save item.id to item.sid', function() {
        this.sync.createItem(this.item);
        return expect(this.collection.get('1')).toBeDefined();
      });
      it('does not mark new item as dirty', function() {
        this.sync.createItem(this.item);
        return expect(this.collection.get('1').get('dirty')).toBeFalsy();
      });
      return it('does not create item which was deleted local', function() {
        this.storage.destroyIds.values = ['1'];
        this.sync.createItem(this.item);
        return expect(this.collection.get('1')).toBeUndefined();
      });
    });
    describe('updateItem', function() {
      beforeEach(function() {
        this.dream = this.dreams.create({
          updated_at: '2012-03-04T14:00:10Z',
          sid: '2'
        }, {
          local: true
        });
        return this.item = {
          name: 'Updated name',
          updated_at: '2012-03-04T14:31:40Z',
          id: '2'
        };
      });
      it('should update attributes when local updated_at < new updated_at', function() {
        this.sync.updateItem(this.item, this.dream);
        return expect(this.dream.get('name')).toEqual('Updated name');
      });
      it('does not save id', function() {
        this.sync.updateItem(this.item, this.dream);
        return expect(this.dream.get('id')).toNotEqual('1');
      });
      it('does nothing when local updated_at greater than new updated_at', function() {
        var callback;
        callback = jasmine.createSpy('-Change Callback-');
        this.dream.on('change', callback);
        this.item.updated_at = '2012-03-04T12:10:10Z';
        this.sync.updateItem(this.item, this.dream);
        return expect(callback.callCount).toBe(0);
      });
      return it('does not mark item as dirty', function() {
        this.sync.updateItem(this.item, this.dream);
        return expect(this.dream.get('dirty')).toBeFalsy();
      });
    });
    describe('push', function() {
      it('should call "pushItem" for dirty items', function() {
        this.dreams.create();
        this.dreams.create({
          id: '2',
          name: 'Diving with scuba'
        });
        spyOn(this.sync, 'pushItem');
        this.sync.push();
        return expect(this.sync.pushItem.callCount).toBe(2);
      });
      return it('should call "flushItem" for destroyed items', function() {
        var destroyedDream;
        destroyedDream = this.dreams.create({
          id: '3',
          name: 'Learning to play on sax',
          sid: '3'
        }, {
          local: true
        });
        destroyedDream.destroy();
        spyOn(this.sync, 'flushItem');
        this.sync.push();
        return expect(this.sync.flushItem.callCount).toBe(1);
      });
    });
    describe('pushItem', function() {
      describe('when item is new', function() {
        beforeEach(function() {
          return this.dream = this.dreams.create();
        });
        it('should call ajax', function() {
          spyOn(this.sync, 'ajax');
          this.sync.pushItem(this.dream);
          return expect(this.sync.ajax).toHaveBeenCalledWith('create', jasmine.any(Object), {
            success: jasmine.any(Function)
          });
        });
        it('sets dirty to false and sets sid', function() {
          var localId;
          registerFakeAjax({
            url: '/api/dreams',
            type: 'post',
            successData: {
              id: '12'
            }
          });
          localId = this.dream.id;
          this.sync.pushItem(this.dream);
          expect(this.dream.get('dirty')).toBeFalsy();
          expect(this.dream.get('sid')).toEqual('12');
          return expect(this.dream.id).toEqual(localId);
        });
        return it('should call "replaceKeyFields"', function() {
          spyOn(this.storage, 'replaceKeyFields');
          spyOn(Backbone, 'ajaxSync');
          this.sync.pushItem(this.dream);
          return expect(this.storage.replaceKeyFields).toHaveBeenCalledWith(this.dream, 'server');
        });
      });
      return describe('when item exists', function() {
        beforeEach(function() {
          return this.dream = this.dreams.create({
            sid: '101'
          });
        });
        it('should call ajax', function() {
          spyOn(this.sync, 'ajax');
          this.sync.pushItem(this.dream);
          return expect(this.sync.ajax).toHaveBeenCalledWith('update', jasmine.any(Object), {
            success: jasmine.any(Function)
          });
        });
        return it('sets dirty to false', function() {
          var localId;
          registerFakeAjax({
            url: "/api/dreams/101",
            type: 'put',
            successData: {}
          });
          localId = this.dream.id;
          this.sync.pushItem(this.dream);
          expect(this.dream.get('dirty')).toBeFalsy();
          return expect(this.dream.id).toEqual(localId);
        });
      });
    });
    return describe('flushItem', function() {
      beforeEach(function() {
        return this.sid = this.dreams.create({
          sid: '3',
          local: true
        }).get('sid');
      });
      it('should call ajax', function() {
        spyOn(this.sync, 'ajax');
        this.sync.flushItem(this.sid);
        return expect(this.sync.ajax).toHaveBeenCalledWith('delete', jasmine.any(Object), {
          success: jasmine.any(Function)
        });
      });
      return it('should clear @destroyIds', function() {
        registerFakeAjax({
          url: "/api/dreams/" + this.sid,
          type: 'delete',
          successData: {}
        });
        this.sync.flushItem(this.sid);
        return expect(this.storage.destroyIds.values).toEqual([]);
      });
    });
  });

}).call(this);
