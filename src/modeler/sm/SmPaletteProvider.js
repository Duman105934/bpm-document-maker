import { KIND_LIST } from './kinds.js';
import { getKindIconUrl } from './icons.js';

/**
 * Добавляет в стандартную палитру группу «State machine».
 */
export default class SmPaletteProvider {

  constructor(palette, create, smElementFactory, translate) {
    this._create = create;
    this._smElementFactory = smElementFactory;
    this._translate = translate;

    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const create = this._create;
    const smElementFactory = this._smElementFactory;
    const translate = this._translate;

    const smEntries = {};

    KIND_LIST.forEach(cfg => {
      const start = event => create.start(event, smElementFactory.createShape(cfg.kind));

      smEntries[`create.sm-${ cfg.kind }`] = {
        group: 'state-machine',
        className: `sm-palette-entry sm-palette-${ cfg.kind }`,
        imageUrl: getKindIconUrl(cfg.kind),
        title: translate('Create {kind}', { kind: cfg.title }) + ' — ' + cfg.description,
        action: {
          dragstart: start,
          click: start
        }
      };
    });

    smEntries['sm-separator'] = {
      group: 'state-machine',
      separator: true
    };

    // свои элементы — первыми
    return entries => ({ ...smEntries, ...entries });
  }
}

SmPaletteProvider.$inject = [ 'palette', 'create', 'smElementFactory', 'translate' ];
