import * as React from 'react';
import { Menubar, Dialog } from 'radix-ui';
import {
	CheckIcon,
	ChevronRightIcon,
	Cross2Icon,
	DotFilledIcon
} from '@radix-ui/react-icons';
import './styles.css';
import { ConfigManager } from '../tools/config_manager';
import type ToolSystem from '../tools/ToolSystem';

const CHECK_ITEMS = ['Always Show Bookmarks Bar', 'Always Show Full URLs'];

interface FilebarProps {
	setImageFiles: React.Dispatch<React.SetStateAction<FileList | null>>;
	configManager: ConfigManager | null;
	toolSystem: ToolSystem | null;
	currentAnnotationClass: string;
}

const Filebar: React.FC<FilebarProps> = (props) => {
	const { setImageFiles, configManager, toolSystem } = props;

	const [checkedSelection, setCheckedSelection] = React.useState([
		CHECK_ITEMS[1],
	]);

	const [isClassesDialogOpen, setIsClassesDialogOpen] = React.useState(false);
	const [classItems, setClassItems] = React.useState<Array<{ id: string, name: string, color: string }>>([]);

	// Update local state when config manager changes
	React.useEffect(() => {
		if (configManager) {
			const configClasses = configManager.getClassNames();
			const items = Object.entries(configClasses).map(([name, color], index) => ({
				id: `class-${index}-${Date.now()}`,
				name,
				color
			}));
			setClassItems(items);
		}
	}, [configManager]);

	const handleSaveClasses = () => {
		if (configManager) {
			// Convert back to config format
			const configFormat: { [key: string]: string } = {};
			classItems.forEach(item => {
				if (item.name.trim()) { // Only save non-empty names
					configFormat[item.name] = item.color;
				}
			});

			configManager.setClassNames(configFormat);
			configManager.saveToStorage();
		}
		setIsClassesDialogOpen(false);
	};

	const handleCancelClasses = () => {
		if (configManager) {
			// Reset to saved config
			const configClasses = configManager.getClassNames();
			const items = Object.entries(configClasses).map(([name, color], index) => ({
				id: `class-${index}-${Date.now()}`,
				name,
				color
			}));
			setClassItems(items);
		}
		setIsClassesDialogOpen(false);
	};

	const updateClassName = (id: string, newName: string) => {
		setClassItems(items => items.map(item =>
			item.id === id ? { ...item, name: newName } : item
		));
	};

	const updateClassColor = (id: string, newColor: string) => {
		setClassItems(items => items.map(item =>
			item.id === id ? { ...item, color: newColor } : item
		));
	};

	const deleteClass = (id: string) => {
		setClassItems(items => items.filter(item => item.id !== id));
	};

	const addClass = () => {
		setClassItems(items => [...items, {
			id: `class-new-${Date.now()}`,
			name: 'New Class',
			color: '#FF0000'
		}]);
	};

	return (
		<Menubar.Root className='MenubarRoot'>
			{/** FILE */}
			<Menubar.Menu>
				<Menubar.Trigger className='MenubarTrigger'>File</Menubar.Trigger>
				<Menubar.Portal>
					<Menubar.Content
						className='MenubarContent'
						align='start'
						sideOffset={5}
						alignOffset={-3}
					>
						<Menubar.Item className='MenubarItem'
							onClick={() => {
								const fileInput = document.getElementById("fileInput") as HTMLInputElement;
								if (fileInput) {
									fileInput.click(); // Programmatically trigger the file input
								}
							}}
						>
							Open <div className='RightSlot'>CTRL + O</div>
						</Menubar.Item>
						<Menubar.Separator className='MenubarSeparator' />
						<Menubar.Sub>
							<Menubar.SubTrigger className='MenubarSubTrigger'>
								Export
								<div className='RightSlot'>
									<ChevronRightIcon />
								</div>
							</Menubar.SubTrigger>
							<Menubar.Portal>
								<Menubar.SubContent
									className='MenubarSubContent'
									alignOffset={-5}
								>
									<Menubar.Item className='MenubarItem'>
										Export All <div className='RightSlot'>CTRL + Shift + E</div>
									</Menubar.Item>
									<Menubar.Item className='MenubarItem'>
										Export Current <div className='RightSlot'>CTRL + Shift + I</div>
									</Menubar.Item>
								</Menubar.SubContent>
							</Menubar.Portal>
						</Menubar.Sub>
					</Menubar.Content>
				</Menubar.Portal>
			</Menubar.Menu>
			{/** EDIT */}
			<Menubar.Menu>
				<Menubar.Trigger className='MenubarTrigger'>Edit</Menubar.Trigger>
				<Menubar.Portal>
					<Menubar.Content
						className='MenubarContent'
						align='start'
						sideOffset={5}
						alignOffset={-3}
					>
						<Menubar.Item className='MenubarItem'>
							Undo <div className='RightSlot'>CTRL + Z</div>
						</Menubar.Item>
						<Menubar.Item className='MenubarItem'>
							Redo <div className='RightSlot'>CTRL + Y</div>
						</Menubar.Item>
						<Menubar.Separator className='MenubarSeparator' />
						<Menubar.Item className='MenubarItem'>Cut</Menubar.Item>
						<Menubar.Item className='MenubarItem'>Copy</Menubar.Item>
						<Menubar.Item className='MenubarItem'>Paste</Menubar.Item>
					</Menubar.Content>
				</Menubar.Portal>
			</Menubar.Menu>
			{/** VIEW */}
			<Menubar.Menu>
				<Menubar.Trigger className='MenubarTrigger'>View</Menubar.Trigger>
				<Menubar.Portal>
					<Menubar.Content
						className='MenubarContent'
						align='start'
						sideOffset={5}
						alignOffset={-14}
					>
						{CHECK_ITEMS.map((item) => (
							<Menubar.CheckboxItem
								className='MenubarCheckboxItem inset'
								key={item}
								checked={checkedSelection.includes(item)}
								onCheckedChange={() =>
									setCheckedSelection((current) =>
										current.includes(item)
											? current.filter((el) => el !== item)
											: current.concat(item),
									)
								}
							>
								<Menubar.ItemIndicator className='MenubarItemIndicator'>
									<CheckIcon />
								</Menubar.ItemIndicator>
								{item}
							</Menubar.CheckboxItem>
						))}
						<Menubar.Separator className='MenubarSeparator' />
						<Menubar.Item className='MenubarItem inset'>
							Reload <div className='RightSlot'>⌘ R</div>
						</Menubar.Item>
						<Menubar.Item className='MenubarItem inset' disabled>
							Force Reload <div className='RightSlot'>⇧ ⌘ R</div>
						</Menubar.Item>
						<Menubar.Separator className='MenubarSeparator' />
						<Menubar.Item className='MenubarItem inset'>
							Toggle Fullscreen
						</Menubar.Item>
						<Menubar.Separator className='MenubarSeparator' />
						<Menubar.Item className='MenubarItem inset'>
							Hide Sidebar
						</Menubar.Item>
					</Menubar.Content>
				</Menubar.Portal>
			</Menubar.Menu>
			{/** CONFIG */}
			<Menubar.Menu>
				<Menubar.Trigger className='MenubarTrigger'>Config</Menubar.Trigger>
				<Menubar.Portal>
					<Menubar.Content
						className='MenubarContent'
						align='start'
						sideOffset={5}
						alignOffset={-14}
					>
						<Menubar.Sub>
							<Menubar.SubTrigger className='MenubarSubTrigger'>
								Classes
								<div className='RightSlot'>
									<ChevronRightIcon />
								</div>
							</Menubar.SubTrigger>
							<Menubar.Portal>
								<Menubar.SubContent
									className='MenubarSubContent'
									alignOffset={-5}
								>
									<Menubar.RadioGroup
										value={toolSystem?.getCurrentAnnotationClass()}
										onValueChange={(value) => toolSystem?.setCurrentAnnotationClass(value)}
									>
										{classItems.map((item) => (
											<Menubar.RadioItem
												className="MenubarRadioItem inset"
												key={item.id}
												value={item.name}
											>
												<Menubar.ItemIndicator className="MenubarItemIndicator">
													<DotFilledIcon style={{ color: item.color }} />
												</Menubar.ItemIndicator>
												{item.name}
											</Menubar.RadioItem>
										))}
									</Menubar.RadioGroup>
									<Menubar.Separator className='MenubarSeparator' />
									<Menubar.Item
										className='MenubarItem'
										onClick={() => setIsClassesDialogOpen(true)}
									>
										Edit Classes...
									</Menubar.Item>
								</Menubar.SubContent>
							</Menubar.Portal>
						</Menubar.Sub>
						<Menubar.Item className='MenubarItem'>Edit…</Menubar.Item>
						<Menubar.Separator className='MenubarSeparator' />
						<Menubar.Item className='MenubarItem'>Import</Menubar.Item>
						<Menubar.Item className='MenubarItem'>Download</Menubar.Item>
					</Menubar.Content>
				</Menubar.Portal>
			</Menubar.Menu>
			<Dialog.Root open={isClassesDialogOpen} onOpenChange={setIsClassesDialogOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="DialogOverlay" />
					<Dialog.Content className="DialogContent">
						<Dialog.Title className="DialogTitle">Configure Classes</Dialog.Title>
						<Dialog.Description className="DialogDescription">
							Manage your class names configuration.
						</Dialog.Description>
						<div className="ClassesList">
							{classItems.map((item) => (
								<div key={item.id} className="ClassItem">
									<input
										type="text"
										value={item.name}
										onChange={(e) => updateClassName(item.id, e.target.value)}
										className="ClassInput"
										placeholder="Class name"
									/>
									<input
										type="color"
										value={item.color}
										onChange={(e) => updateClassColor(item.id, e.target.value)}
										className="ColorInput"
									/>
									<button
										onClick={() => deleteClass(item.id)}
										className="DeleteButton"
									>
										<Cross2Icon />
									</button>
								</div>
							))}
						</div>
						<button
							onClick={addClass}
							className="AddButton"
						>
							Add Class
						</button>
						<div className="DialogActions">
							<Dialog.Close asChild>
								<button className="Button green" onClick={handleSaveClasses}>Save</button>
							</Dialog.Close>
							<Dialog.Close asChild>
								<button className="Button gray" onClick={handleCancelClasses}>Cancel</button>
							</Dialog.Close>
						</div>

						<Dialog.Close asChild>
							<button className="IconButton" aria-label="Close">
								<Cross2Icon />
							</button>
						</Dialog.Close>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
			{/** Keep input outside of the Menubar popovers, since clicking removes it from the DOM :( */}
			<input
				id='fileInput'
				type='file'
				multiple
				style={{ display: 'none' }}
				onChange={(e) => {
					console.log(e.currentTarget.files);
					if (e.currentTarget.files) {
						setImageFiles(e.currentTarget.files);
					}
				}}
			/>
		</Menubar.Root>
	);
};

export default Filebar;