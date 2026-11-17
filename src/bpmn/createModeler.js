import BpmnModeler from 'bpmn-js/lib/Modeler';

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

import '../styles/sm.css';

import { CreateAppendAnythingModule } from 'bpmn-js-create-append-anything';

import { SmEditModule, smModdleDescriptor } from '../modeler/sm/index.js';
import SmPropertiesProviderModule from '../properties/index.js';
import RuTranslateModule from '../i18n/ru.js';

/**
 * Редактор BPMN с видами state machine (Event / State / Cmd / API / Mobile / JSON / DB).
 *
 * @param {{ container: HTMLElement, propertiesParent: HTMLElement, smProject?: object }} options
 *        smProject — связь с проектом: { getScreens, onOpenScreen, isViewMode } (сервис smProjectBridge)
 */
export function createModeler({ container, propertiesParent, smProject }) {
  return new BpmnModeler({
    container,
    propertiesPanel: {
      parent: propertiesParent
    },
    additionalModules: [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      CreateAppendAnythingModule,
      SmEditModule,
      SmPropertiesProviderModule,
      RuTranslateModule
    ],
    moddleExtensions: {
      sm: smModdleDescriptor
    },
    smProject
  });
}
