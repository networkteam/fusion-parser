const expect = require('chai').expect;
const fusionParser = require('../dist/fusion-parser');

describe('parser', () => {
  it('parses a single definition', () => {
    const tree = fusionParser.parse(`foo.bar = "Test"`);
    expect(tree).to.deep.equal([
      {
        kind: 'definition',
        path: [
          {
            property: 'foo'
          },
          {
            property: 'bar'
          }
        ],
        value: {
          simpleValue: 'Test'
        }
      }
    ]);
  });

  it('parses multiple definitions', () => {
    const tree = fusionParser.parse(`
      foo = "Test"
      'foo' {
        @process.answer = 42
      }
    `);
    expect(tree).to.deep.equal([
      {
        kind: 'definition',
        path: [
          {
            property: 'foo'
          }
        ],
        value: {
          simpleValue: 'Test'
        }
      },
      {
        kind: 'definition',
        path: [
          {
            property: 'foo'
          }
        ],
        block: [
          {
            kind: 'definition',
            path: [
              {
                property: '@process'
              },
              {
                property: 'answer'
              }
            ],
            value: {
              simpleValue: 42
            }
          }
        ]
      }
    ]);
  });

  it('parses object definition with block', () => {
    const tree = fusionParser.parse(`
      renderer = Neos.Fusion:Value {
        value = \${props.foo}
      }
    `);
    expect(tree).to.deep.equal([
      {
        kind: 'definition',
        path: [
          {
            property: 'renderer'
          }
        ],
        value: {
          objectName: 'Neos.Fusion:Value'
        },
        block: [
          {
            kind: 'definition',
            path: [
              {
                property: 'value'
              }
            ],
            value: {
              expression: 'props.foo'
            }
          }
        ]
      }
    ]);
  });

  it('parses a first level prototype', () => {
    const tree = fusionParser.parse(`
      prototype(My.Package:Object.Name) {
        @class = 'My\\\\Implementation\\\\Class'
      }
    `);
    expect(tree).to.deep.equal([
      {
        kind: 'definition',
        path: [
          {
            prototype: 'My.Package:Object.Name'
          }
        ],
        block: [
          {
            kind: 'definition',
            path: [
              {
                property: '@class'
              }
            ],
            value: {
              simpleValue: 'My\\\\Implementation\\\\Class'
            }
          }
        ]
      }
    ])
  });

  it('parses nested prototypes', () => {
    const tree = fusionParser.parse(`
      prototype(My.Package:Object.Name) {
        prototype(My.Package:Other.Object) {
          @if.notEmpty = true
        }
      }
    `);
    expect(tree).to.deep.equal([
      {
        kind: 'definition',
        path: [
          {
            prototype: 'My.Package:Object.Name'
          }
        ],
        block: [
          {
            kind: 'definition',
            path: [
              {
                prototype: 'My.Package:Other.Object'
              }
            ],
            block: [
              {
                kind: 'definition',
                path: [
                  {
                    property: '@if'
                  },
                  {
                    property: 'notEmpty'
                  }
                ],
                value: {
                  simpleValue: true
                }
              }
            ]
          }
        ]
      }
    ]);
  });

  it('parses includes', () => {
    const tree = fusionParser.parse(`
      include: My/Custom/Object.fusion
      foo = "bar"
      include: 'Another/Custom/Object.fusion'
    `);
    expect(tree).to.deep.equal([
      {
        kind: 'include',
        pattern: 'My/Custom/Object.fusion'
      },
      {
        kind: 'definition',
        path: [
          {
            property: 'foo',
          }
        ],
        value: {
          simpleValue: 'bar'
        }
      },
      {
        kind: 'include',
        pattern: 'Another/Custom/Object.fusion'
      }
    ]);
  });

  it('parses complex Fusion', () => {
    const output = fusionParser.parse(`
      /*
       * From the Neos default rendering
       */

      include: Prototypes/ContentCase.fusion
      include: Prototypes/Document.fusion
      include: Prototypes/Content.fusion
      include: Prototypes/ContentComponent.fusion
      include: Prototypes/PrimaryContent.fusion
      include: Prototypes/ContentCollection.fusion
      include: Prototypes/Page.fusion
      include: Prototypes/Shortcut.fusion
      include: Prototypes/BreadcrumbMenu.fusion
      include: Prototypes/DimensionsMenu.fusion
      include: Prototypes/Menu.fusion
      include: Prototypes/Plugin.fusion
      include: Prototypes/PluginView.fusion
      include: Prototypes/ConvertUris.fusion
      include: Prototypes/ConvertNodeUris.fusion
      include: Prototypes/DocumentMetadata.fusion
      include: Prototypes/Editable.fusion
      include: Prototypes/ContentElementWrapping.fusion
      include: Prototypes/ContentElementEditable.fusion
      include: Prototypes/NodeUri.fusion
      include: Prototypes/ImageUri.fusion
      include: Prototypes/FallbackNode.fusion

      # The root matcher used to start rendering in Neos
      #
      # The default is to use a render path of "page", unless the requested format is not "html"
      # in which case the format string will be used as the render path (with dots replaced by slashes)
      #
      root = Neos.Fusion:Case {
        shortcut {
          prototype(Neos.Neos:Page) {
            body = Neos.Neos:Shortcut
          }

          @position = 'start'
          condition = \${q(node).is('[instanceof Neos.Neos:Shortcut]')}
          type = 'Neos.Neos:Page'
        }

        editPreviewMode {
          @position = 'end 9996'
          possibleEditPreviewModePath = \${documentNode.context.currentRenderingMode.fusionPath}
          condition = \${documentNode.context.inBackend && this.possibleEditPreviewModePath != null && this.possibleEditPreviewModePath != ''}
          renderPath = \${'/' + this.possibleEditPreviewModePath}
        }

        layout {
          @position = 'end 9997'
          layout = \${q(node).property('layout') != null && q(node).property('layout') != '' ? q(node).property('layout') : q(node).parents('[subpageLayout][subpageLayout != ""]').first().property('subpageLayout')}
          condition = \${this.layout != null && this.layout != ''}
          renderPath = \${'/' + this.layout}
        }

        format {
          @position = 'end 9998'
          condition = \${request.format != 'html'}
          renderPath = \${'/' + String.replace(request.format, '.', '/')}
        }

        default {
          @position = 'end 9999'
          condition = TRUE
          renderPath = '/page'
        }

        @cache {
          mode = 'cached'

          entryIdentifier {
            node = \${node}
          }
          entryTags {
            # Whenever the node changes the matched condition could change
            1 = \${'Node_' + documentNode.identifier}
            # Whenever one of the parent nodes changes the layout could change
            2 = \${Neos.Caching.nodeTag(q(documentNode).parents())}
          }
        }

        # Catch all unhandled exceptions at the root
        @exceptionHandler = 'Neos\\Neos\\Fusion\\ExceptionHandlers\\PageHandler'
      }

      # Extension of the GlobalCacheIdentifiers prototype
      #
      # We add the names of workspaces of the current workspace chain (for example, "user-john,some-workspace,live") to the list
      # of entry identifier pieces in order to make sure that a specific combination of workspaces has its own content cache entry.
      #
      prototype(Neos.Fusion:GlobalCacheIdentifiers) {
        workspaceChain = \${documentNode.context.workspace.name + ',' + Array.join(Array.keys(documentNode.context.workspace.baseWorkspaces), ',')}
        editPreviewMode = \${documentNode.context.currentRenderingMode.name}
      }
    `)
  });

  describe('with addLocation', () => {
    it('adds loc to all levels', () => {
      const tree = fusionParser.parse(`
        prototype(My.Package:Object.Name) {
          prototype(My.Package:Other.Object) {
            @if.notEmpty = true
          }
        }
        foo = My.Package:Other.Object
      `.trim(), { addLocation: true });

      expect(tree).to.have.length(2);
      expect(tree[1]).to.nested.include({
        'loc.start.line': 6,
        'loc.start.column': 9
      });
    });
  });
});