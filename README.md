# Interactive JS Planner

A one-page web app built with Ruby on Rails, with the primary text-editor-like interaction handled by Javascript.

The application uses a MySQL database and AJAX to do real-time updates as the app receives user inputs.

[Demo](http://codeclarity-rails-env.wwbjnn5pyv.us-east-1.elasticbeanstalk.com/)
![Demo screenshots](https://monosnap.com/file/dFyeHauOZ29MGPycVFqudCU6w0G61H.png)

### Tech stack
1. Ruby on Rails
2. jQuery (+ jQuery ajax): Handles most interactivity -- most of the magic happens [here](https://github.com/hungtraan/Interactive-JS-Planner/blob/feature/refresh-tag-on-tab-change/app/assets/javascripts/application.js)
3. MySQL
3. Bootstrap JS and CSS
4. [Nested Sortable by ilikenwd](https://github.com/ilikenwf/nestedSortable)
5. Amazon Web Services Beanstalk for cloud hosting and deployment

### What I learnt
1. I learn to love jQuery for how straight-forward it is to implement interactivity
2. I learn to "grow away" from jQuery for future projects of this nature
a. As much as I love prototyping this project with jQuery, code organization for element interactivity as well as dynamic data/state management is a pain. As features grow, the code grows much more since one click can result in several DOM & data updates.
b. As the product is built to maximize user interactivity by leveraging real-time update, most updates are handled by jQuery `$().html()`, `$().data()` or `$().attr()` and saved to HTML data attributes (while `$.ajax)` updates the change to server). Or [this](http://take.ms/Gyxja).
c. After surveying **AngularJS** or even **ReactJS**, similar implementation should be built around these models instead.
3. Event bubbling in JS could cause **huge** performance problem if handled carelessly, e.g. in the `focusContentEditable()` function where it potentially has to call itself in many interactivity events
a. In such case, don't forget to use `event.stopImmediatePropagation();` or `event.stopPropagation();`
b. `stopPropagation()` prevents any parent handlers from being executed, `stopImmediatePropagation` does the same **and also** prevents other handlers from executing.
4. Graph search in a real project! Bread-first search is implemented to render the item tree when tags are selected.
5. Recursion in action: [Tree traversal to render tree items](https://github.com/hungtraan/Interactive-JS-Planner/blob/feature/refresh-tag-on-tab-change/app/views/onepage/_item.erb#L13) -- well, you would totally expect that when working with tree data structure, wouldn't you



### Implementation

One implementation is to create a more transparent view of the development process, highlighting prioritization, association and other parts of the process. 

### Feature to be included
- Account system (AuthO with Google and Facebook login)
- Permissing system: Transform the project into a "Pastebin of online planner"
