import { renderValue } from 'vanilla-jsoneditor';
import { openReference } from './index';

function renderLink(node, props) {
    const link = document.createElement('a');
    link.textContent = props.value;
    link.style.cursor = 'pointer';
    link.style.color = 'green';
    link.style.textDecoration = 'underline';

    link.onclick = (event) => {
        console.log(props.value);

        event.preventDefault();
        event.stopPropagation();
    };

    node.appendChild(link);
}

function renderReference(node, props) {
    const link = document.createElement('a');
    link.textContent = props.value;
    link.style.cursor = 'pointer';
    link.style.color = 'green';
    link.style.textDecoration = 'underline';

    // Отменяем стандартное поведение Ctrl+Клик
    link.onclick = async (event) => {
        await openReference(props.value);

        event.preventDefault();
        event.stopPropagation();
    };

    node.appendChild(link);
}

export function onRenderValue(props) {
    if (props.path[props.path.length - 1] == 'reference') {
        return [{ action: renderReference, props }]
    }

    if (typeof props.value === 'string' && props.value.startsWith('http')) {
        return [{ action: renderLink, props }]
    }

    return renderValue(props);
}
