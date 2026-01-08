from __future__ import annotations
###############################################################################
# Imports                                                                     #
###############################################################################

# — Standard library —
import argparse
import os
import time
from typing import Optional, Tuple

# — Third-party —
import mss
import Quartz
from PIL import Image
from AppKit import NSScreen

print("active_screen_capture.py loaded")

###############################################################################
# Screen-geometry helpers                                                     #
###############################################################################


def _get_mouse_position() -> Tuple[float, float]:
    """Get the current mouse cursor position.
    
    Returns
    -------
    (x, y) tuple in screen coordinates.
    """
    mouse_location = Quartz.CGEventGetLocation(Quartz.CGEventCreate(None))
    return (mouse_location.x, mouse_location.y)


def _get_active_screen_bounds() -> Optional[Tuple[int, int, int, int]]:
    """Get the bounds of the screen containing the mouse cursor.
    
    Returns
    -------
    (x, y, width, height) tuple in screen coordinates, or None if not found.
    """
    mouse_x, mouse_y = _get_mouse_position()
    
    # Get all active displays
    err, display_ids, count = Quartz.CGGetActiveDisplayList(16, None, None)
    if err != Quartz.kCGErrorSuccess:
        print(f"Failed to get display list: {err}")
        return None
    
    # Find which display contains the mouse cursor
    for display_id in display_ids[:count]:
        bounds = Quartz.CGDisplayBounds(display_id)
        x = int(bounds.origin.x)
        y = int(bounds.origin.y)
        w = int(bounds.size.width)
        h = int(bounds.size.height)
        
        # Check if mouse is within this display
        if x <= mouse_x < x + w and y <= mouse_y < y + h:
            print(f"Active screen found at: x={x}, y={y}, w={w}, h={h}")
            print(f"Mouse position: ({mouse_x:.0f}, {mouse_y:.0f})")
            return (x, y, w, h)
    
    return None


def _get_active_screen_info() -> Optional[dict]:
    """Get detailed information about the screen containing the mouse cursor.
    
    Returns
    -------
    Dictionary with screen information, or None if not found.
    """
    mouse_x, mouse_y = _get_mouse_position()
    
    err, display_ids, count = Quartz.CGGetActiveDisplayList(16, None, None)
    if err != Quartz.kCGErrorSuccess:
        return None
    
    for display_id in display_ids[:count]:
        bounds = Quartz.CGDisplayBounds(display_id)
        x = bounds.origin.x
        y = bounds.origin.y
        w = bounds.size.width
        h = bounds.size.height
        
        if x <= mouse_x < x + w and y <= mouse_y < y + h:
            # Get additional display info
            is_main = Quartz.CGDisplayIsMain(display_id)
            is_builtin = Quartz.CGDisplayIsBuiltin(display_id)
            
            return {
                'display_id': display_id,
                'bounds': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                'is_main': bool(is_main),
                'is_builtin': bool(is_builtin),
                'mouse_position': (mouse_x, mouse_y),
            }
    
    return None


###############################################################################
# Screenshot capture                                                          #
###############################################################################


def capture_active_screen(output_dir: str = "~/Desktop", filename: Optional[str] = None) -> Optional[str]:
    """Capture a screenshot of the screen containing the mouse cursor.
    
    Args:
        output_dir (str): Directory to save the screenshot. Defaults to "~/Desktop".
        filename (Optional[str]): Custom filename. If None, generates timestamp-based name.
    
    Returns:
        Optional[str]: Path to the saved screenshot, or None if capture failed.
    """
    # Get active screen bounds
    bounds = _get_active_screen_bounds()
    
    if bounds is None:
        print("No active screen found")
        return None
    
    x, y, w, h = bounds
    
    # Capture the screen region using mss
    with mss.mss() as sct:
        # Define the monitor region to capture
        monitor = {
            "left": x,
            "top": y,
            "width": w,
            "height": h,
        }
        
        # Grab the screenshot
        screenshot = sct.grab(monitor)
        
        # Convert to PIL Image
        img = Image.frombytes("RGB", (screenshot.width, screenshot.height), screenshot.rgb)
        
        # Prepare output path
        output_dir = os.path.abspath(os.path.expanduser(output_dir))
        os.makedirs(output_dir, exist_ok=True)
        
        if filename is None:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = f"active_screen_{timestamp}.png"
        
        output_path = os.path.join(output_dir, filename)
        
        # Save the image
        img.save(output_path, "PNG", overwrite=True)
        print(f"Screenshot saved to: {output_path}")
        
        return output_path


def capture_active_screen_with_info(output_dir: str = "~/.cache", filename: str = "recordr_screenshot.jpg") -> Optional[Tuple[str, dict]]:
    """Capture a screenshot of the active screen and return screen information.
    
    Args:
        output_dir (str): Directory to save the screenshot. Defaults to "~/Desktop".
    
    Returns:
        Optional[Tuple[str, dict]]: Tuple of (screenshot_path, screen_info), or None if failed.
    """
    # Get screen info first
    screen_info = _get_active_screen_info()
    
    if screen_info is None:
        print("No active screen found")
        return None
    
    # Capture screenshot
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    display_type = "main" if screen_info['is_main'] else "secondary"
    filename = f"screen_{display_type}_{timestamp}.png"
    
    screenshot_path = capture_active_screen(output_dir=output_dir, filename=filename)
    print(f"Screenshot saved to: {screenshot_path}")
    
    if screenshot_path:
        return (screenshot_path, screen_info)
    
    return None


###############################################################################
# Main function                                                               #
###############################################################################


def main() -> None:
    """Main entry point for capturing active screen screenshot."""
    parser = argparse.ArgumentParser(
        description='Capture a screenshot of the screen containing the mouse cursor'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default="~/.cache",
        help='Directory to save the screenshot (default: ~/Desktop)'
    )

    parser.add_argument(
        '--with-info',
        action='store_true',
        help='Print detailed screen information'
    )
    
    args = parser.parse_args()
    filename = "recordr_screenshot.jpg"
    
    # Check for screen capture permission
    if not Quartz.CGPreflightScreenCaptureAccess():
        print("Screen capture NOT allowed; requesting permission...")
        # Request permission
        Quartz.CGRequestScreenCaptureAccess()
        raise PermissionError("Screen capture not allowed. Please grant permission in System Preferences.")
    
    print("Screen capture allowed for this process.")
    
    # Capture the screenshot
    if args.with_info:
        result = capture_active_screen_with_info(output_dir=args.output_dir, filename=filename)
        if result:
            screenshot_path, screen_info = result
            print("\n=== Screen Information ===")
            print(f"Display ID: {screen_info['display_id']}")
            print(f"Position: ({screen_info['bounds']['x']}, {screen_info['bounds']['y']})")
            print(f"Size: {screen_info['bounds']['width']}x{screen_info['bounds']['height']}")
            print(f"Is Main Display: {screen_info['is_main']}")
            print(f"Is Built-in Display: {screen_info['is_builtin']}")
            print(f"Mouse Position: ({screen_info['mouse_position'][0]:.0f}, {screen_info['mouse_position'][1]:.0f})")
    else:
        screenshot_path = capture_active_screen(
            output_dir=args.output_dir,
            filename=filename
        )
    
    if screenshot_path:
        print(f"\n✓ Successfully captured active screen")
    else:
        print(f"\n✗ Failed to capture active screen")


if __name__ == "__main__":
    main()