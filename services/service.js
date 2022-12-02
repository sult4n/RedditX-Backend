/**
 * FILE: service.js
 * description: the service class that obtains the common services between controllers
 * created at: 15/11/2022
 * created by: Mohamed Nabil
 * authors: Ahmed Lotfy, Moaz Mohamed, Shredan Abdullah, Mohamed Nabil
 */

/**
 * INCLUDES
 */
const APIfeatures = require("./../utils/api-features");

/**
 * @namespace Service
 */
class Service {
  constructor(model) {
    this.model = model;
  }

  getAll = (findQuery, query) => {
    const features = new APIfeatures(this.model.find(findQuery), query)
      .sort()
      .filter()
      .paginate()
      .selectFields();
    return features.query;
  };

  getOne = (query) => {
    let fields = "";
    if (query.select) {
      fields = query.select;
      delete query.select;
    }
    const res = this.model.findOne(query);
    if (fields) {
      const result = res.select(fields);
      return result;
    }
    return res;
  };

  updateOne = (query, update) => {///msh 3arfa ab3t elfunction ezay hena
    return this.model.findOneAndUpdate(query, update,(error, doc) => {
      if(!error)return doc;
      else return null;
            // error: any errors that occurred
      // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
    }).clone();
  };

  findById = (id, select) => {
    if (select && select !== "") return this.model.findById(id).select(select);
    else return this.model.findById(id);
  };

  find = (query, select) => {
    if (select && select !== "") return this.model.find(query).select(select);
    else return this.model.find(query);
  };

  findByIdAndUpdate = (id, data, options) => {
    return this.model.findByIdAndUpdate(id, data, options);
  };

  deleteOne = (query) => {
    return this.model.findOneAndDelete(query);
  };

  deleteMany = (query) => {
    this.model.deleteMany(query);
  };

  insert = (data) => {
    return this.model.create(data);
  };
}
module.exports = Service;
